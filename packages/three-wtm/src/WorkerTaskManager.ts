export type WorkerRegistration = {
    module: boolean;
    blob: boolean;
    url: URL | string | undefined;
}

/**
 * Register one to many tasks type to the WorkerTaskManager. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The WorkerTaskManager allows to execute a maximum number of executions in parallel.
 *
 * Initial idea by Don McCurdy / https://www.donmccurdy.com / https://github.com/mrdoob/three.js/issues/18234
 */
class WorkerTaskManager {

    private taskTypes: Map<string, WorkerTypeDefinition>;
    private verbose: boolean;
    private maxParallelExecutions: number;
    private actualExecutionCount: number;
    private workerExecutionPlans: WorkerExecutionPlan[];

    /**
     * Creates a new WorkerTaskManager instance.
     *
     * @param {number} [maxParallelExecutions] How many workers are allowed to be executed in parallel.
     */
    constructor(maxParallelExecutions: number) {
        this.taskTypes = new Map();
        this.verbose = false;
        this.maxParallelExecutions = maxParallelExecutions ? maxParallelExecutions : 4;
        this.actualExecutionCount = 0;
        this.workerExecutionPlans = [];
    }

    /**
     * Set if logging should be verbose
     *
     * @param {boolean} verbose
     * @return {WorkerTaskManager}
     */
    setVerbose(verbose: boolean) {
        this.verbose = verbose;
        return this;
    }

    /**
     * Set the maximum number of parallel executions.
     *
     * @param {number} maxParallelExecutions How many workers are allowed to be executed in parallel.
     * @return {WorkerTaskManager}
     */
    setMaxParallelExecutions(maxParallelExecutions: number) {
        this.maxParallelExecutions = maxParallelExecutions;
        return this;
    }

    /**
     * Returns the maximum number of parallel executions.
     * @return {number}
     */
    getMaxParallelExecutions() {
        return this.maxParallelExecutions;
    }

    /**
     * Returns true if support for the given task type is available.
     *
     * @param {string} taskTypeName The task type as string
     * @return boolean
     */
    supportsTaskType(taskTypeName: string) {
        return this.taskTypes.has(taskTypeName);
    }

    /**
     * Registers functionality for a new task type based on module file.
     *
     * @param {string} taskTypeName The name to be used for registration.
     * @param {WorkerRegistration} workerRegistration
     * @return {boolean} Tells if registration is possible (new=true) or if task was already registered (existing=false)
     */
    registerTask(taskTypeName: string, workerRegistration: WorkerRegistration) {
        const allowedToRegister = !this.supportsTaskType(taskTypeName);
        if (allowedToRegister) {
            const workerTypeDefinition = new WorkerTypeDefinition(taskTypeName, workerRegistration, this.maxParallelExecutions, this.verbose);
            this.taskTypes.set(taskTypeName, workerTypeDefinition);
        }
        return allowedToRegister;
    }

    /**
     * Provides initialization configuration and transferable objects.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {PayloadType} payload Configuration properties as serializable string.
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     */
    async initTaskType(taskTypeName: string, payload: PayloadType, transferables?: Transferable[]) {
        return new Promise<void>((resolveWorker, rejectWorker) => {
            const workerTypeDefinition = this.taskTypes.get(taskTypeName);
            if (workerTypeDefinition) {
                workerTypeDefinition.init(resolveWorker, rejectWorker, payload, transferables);
            }
            else {
                rejectWorker();
            }
        });
    }

    /**
     * Queues a new task of the given type. Task will not execute until initialization completes.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {PayloadType} payload Configuration properties as serializable string.
     * @param {(data: PayloadType) => void} onComplete Invoke this function if everything is completed
     * @param {(data: PayloadType) => void} onIntermediate Invoke this function if an asset become intermediately available
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     * @return {Promise}
     */
    async enqueueForExecution(taskTypeName: string, payload: PayloadType, onComplete: (data: PayloadType) => void,
        onIntermediate?: (data: PayloadType) => void, transferables?: Transferable[]) {
        const plan = {
            taskTypeName: taskTypeName,
            payload: payload,
            onComplete: onComplete,
            onIntermediate: onIntermediate,
            transferables: transferables
        };
        return this.enqueueWorkerExecutionPlan(plan);
    }

    async enqueueWorkerExecutionPlan(plan: WorkerExecutionPlan) {
        const promise = this.buildWorkerExecutionPlanPromise(plan);
        this.workerExecutionPlans.push(plan);
        this.depleteExecutions();
        return promise;
    }

    private buildWorkerExecutionPlanPromise(plan: WorkerExecutionPlan) {
        return new Promise<void>((resolve, reject) => {
            plan.promiseFunctions = {
                resolve: resolve,
                reject: reject
            };
        });
    }

    private depleteExecutions() {
        let counter = 0;
        while (this.actualExecutionCount < this.maxParallelExecutions && counter < this.workerExecutionPlans.length) {

            // TODO: storedExecutions and results from worker seem to get mixed up???
            const plan = this.workerExecutionPlans[counter];
            const workerTypeDefinition = this.taskTypes.get(plan.taskTypeName);
            if (workerTypeDefinition) {
                const taskWorker = workerTypeDefinition.getAvailableTask();
                if (taskWorker) {
                    this.workerExecutionPlans.splice(counter, 1);
                    this.actualExecutionCount++;
                    const promiseWorker = workerTypeDefinition.execute(taskWorker, plan);
                    promiseWorker.then((message: unknown) => {
                        workerTypeDefinition.returnAvailableTask(taskWorker);
                        plan.onComplete((message as MessageEvent).data);
                        plan.promiseFunctions?.resolve();
                        this.actualExecutionCount--;
                        this.depleteExecutions();
                    }).catch((e) => {
                        plan.promiseFunctions?.reject(new Error('Execution error: ' + e));
                        this.actualExecutionCount--;
                        this.depleteExecutions();
                    });
                }
                else {
                    counter++;
                }
            }
            else {
                console.log('no executions');
            }
        }
    }

    /**
     * Destroys all workers and associated resources.
     * @return {WorkerTaskManager}
     */
    dispose() {
        for (const workerTypeDefinition of Array.from(this.taskTypes.values())) {
            workerTypeDefinition.dispose();
        }
        return this;
    }
}

type Workers = {
    instances: TaskWorker[],
    available: TaskWorker[]
}

/**
 * Defines a worker type: functions, dependencies and runtime information once it was created.
 */
export class WorkerTypeDefinition {

    private taskTypeName: string;
    private verbose: boolean;

    private workerRegistration: WorkerRegistration = {
        module: true,
        blob: false,
        url: undefined
    };

    private workers: Workers;

    /**
     * Creates a new instance of {@link WorkerTypeDefinition}.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {Number} maximumCount Maximum worker count
     * @param {boolean} [verbose] Set if logging should be verbose
     */
    constructor(taskTypeName: string, workerRegistration: WorkerRegistration, maximumCount: number, verbose: boolean) {
        this.taskTypeName = taskTypeName;
        this.workerRegistration = workerRegistration;
        this.verbose = verbose === true;

        this.workers = {
            instances: new Array(maximumCount),
            available: []
        };
    }

    static createWorkerBlob(code: string[]) {
        const simpleWorkerBlob = new Blob(code, { type: 'application/javascript' });
        return window.URL.createObjectURL(simpleWorkerBlob);
    }

    static async wait(milliseconds: number) {
        return new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        });
    }

    async init(resolveWorker: (value: void | PromiseLike<void>) => void, rejectWorker: (reason?: unknown) => void,
        payload: PayloadType, transferables?: Transferable[]) {
        this.createWorkers();
        if (this.verbose) {
            console.log(`Task: ${this.taskTypeName}: Waiting for completion of initialization of all workers.`);
        }

        const promises = [];
        for (const taskWorker of this.workers.instances) {
            promises.push(this.initWorker(taskWorker, payload, transferables));
        }
        await Promise.all(promises)
            .then(() => {
                if (this.verbose) {
                    console.log(`Task: ${this.taskTypeName}: All workers are initialized.`);
                }
                this.workers.available = this.workers.instances;
                resolveWorker();
            })
            .catch((error: unknown) => {
                rejectWorker(`Error: ${this.taskTypeName}: Not all workers were initialized: ${error}`);
            });
    }

    private createWorkers() {
        if (this.workerRegistration.url) {
            for (let worker, i = 0; i < this.workers.instances.length; i++) {
                if (this.workerRegistration.blob) {
                    worker = {
                        workerId: i,
                        worker: new Worker(this.workerRegistration.url)
                    };
                }
                else {
                    const workerOptions = (this.workerRegistration.module ? { type: 'module' } : { type: 'classic' }) as WorkerOptions;
                    worker = {
                        workerId: i,
                        worker: new Worker((this.workerRegistration.url as URL).href, workerOptions)
                    }
                }
                this.workers.instances[i] = worker;
            }
        }
    }

    private initWorker(taskWorker: TaskWorker, payload: PayloadType, transferables?: Transferable[]) {
        return new Promise<void>((resolveWorker, rejectWorker) => {
            taskWorker.worker.onmessage = message => {
                if (this.verbose) console.log(`Init Complete: ${payload.type}: ${message.data.id}`);
                resolveWorker();
            };
            taskWorker.worker.onerror = rejectWorker;
            payload.cmd = 'init';
            payload.workerId = taskWorker.workerId;
            if (transferables) {
                // ensure all transferables are copies to all workers on init!
                const transferablesToWorker = [];
                for (const transferable of transferables) {
                    transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                }
                taskWorker.worker.postMessage(payload, transferablesToWorker);
            }
            else {
                taskWorker.worker.postMessage(payload);
            }
        });
    }

    execute(taskWorker: TaskWorker, plan: WorkerExecutionPlan) {
        return new Promise((resolveWorker, rejectWorker) => {
            taskWorker.worker.onmessage = message => {
                // allow intermediate asset provision before flagging execComplete
                if (message.data.cmd === 'intermediate') {
                    if (typeof plan.onIntermediate === 'function') {
                        plan.onIntermediate(message.data);
                    }
                } else {
                    resolveWorker(message);
                }
            };
            taskWorker.worker.onerror = rejectWorker;
            plan.payload.cmd = 'execute';
            plan.payload.workerId = taskWorker.workerId;
            taskWorker.worker.postMessage(plan.payload, plan.transferables!);
        });
    }

    /**
     * Returns the first {@link TaskWorker} from array of available workers.
     *
     * @return {TaskWorker|undefined}
     */
    getAvailableTask() {
        let task = undefined;
        if (this.hasTask()) {
            task = this.workers.available.shift();
        }
        return task;
    }

    /**
     * Returns if a task is available or not.
     *
     * @return {boolean}
     */
    hasTask() {
        return this.workers.available.length > 0;
    }

    /**
     *
     * @param {TaskWorker} taskWorker
     */
    returnAvailableTask(taskWorker: TaskWorker) {
        this.workers.available.push(taskWorker);
    }

    /**
     * Dispose all worker instances.
     */
    dispose() {
        for (const taskWorker of this.workers.instances) {
            taskWorker.worker.terminate();
        }
    }

}

export type WorkerExecutionPlan = {
    taskTypeName: string;
    payload: PayloadType;
    onComplete: (data: PayloadType) => void;
    onIntermediate?: (data: PayloadType) => void;
    transferables?: Transferable[];
    promiseFunctions?: {
        resolve: (value: void | PromiseLike<void>) => void | undefined,
        reject: (reason?: unknown) => void | undefined
    };
}

type TaskWorker = {
    workerId: number;
    worker: Worker;
}

type PayloadType = {
    cmd: string;
    id: number;
    name: string | 'unknown';
    type?: string | 'unknown';
    workerId?: number;
    // TODO: params should be data
    params?: Record<string, unknown>;
}

interface WorkerTaskManagerWorker {

    init(payload: PayloadType): void;

    execute(payload: PayloadType): void;

    comRouting(message: never): void;

}

class WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {

    init(payload: PayloadType): void {
        console.log(`WorkerTaskManagerDefaultWorker#init: name: ${payload.type} id: ${payload.id} workerId: ${payload.workerId}`);
    }

    execute(payload: PayloadType): void {
        console.log(`WorkerTaskManagerDefaultWorker#execute: name: ${payload.type} id: ${payload.id} workerId: ${payload.workerId}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comRouting(message: MessageEvent<any>) {
        const payload = (message as MessageEvent).data as PayloadType;
        if (payload) {
            if (payload.cmd === 'init') {
                this.init(payload);
            }
            else if (payload.cmd === 'execute') {
                this.execute(payload);
            }
        }
    }
}

export { WorkerTaskManager, PayloadType, WorkerTaskManagerWorker, WorkerTaskManagerDefaultWorker };

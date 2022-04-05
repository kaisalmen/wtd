export type WorkerRegistration = {
    module: boolean;
    blob: boolean;
    url: URL | string | undefined;
}

type WorkerTaskRuntimeDesc = {
    workerStories: Map<number, WorkerTypeDefinition>;
    readonly maxParallelExecutions: number;
}
/**
 * Register one to many tasks type to the WorkerTaskManager. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The WorkerTaskManager allows to execute a maximum number of executions in parallel.
 *
 * Initial idea by Don McCurdy / https://www.donmccurdy.com / https://github.com/mrdoob/three.js/issues/18234
 */
class WorkerTaskManager {

    private taskTypes: Map<string, WorkerTaskRuntimeDesc>;
    private verbose: boolean;
    private defaultMaxParallelExecutions: number;
    private workerExecutionPlans: WorkerExecutionPlan[];

    /**
     * Creates a new WorkerTaskManager instance.
     *
     * @param {number} [defaultMaxParallelExecutions] How many workers are allowed to be executed in parallel.
     */
    constructor(defaultMaxParallelExecutions?: number) {
        this.taskTypes = new Map();
        this.verbose = false;
        this.defaultMaxParallelExecutions = defaultMaxParallelExecutions ?? 4;
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
    registerTask(taskTypeName: string, workerRegistration: WorkerRegistration, maxParallelExecutions?: number) {
        const allowedToRegister = !this.supportsTaskType(taskTypeName);
        if (allowedToRegister) {
            maxParallelExecutions = maxParallelExecutions ?? this.defaultMaxParallelExecutions;
            const workerTaskRuntimeDesc: WorkerTaskRuntimeDesc = {
                workerStories: new Map(),
                maxParallelExecutions: maxParallelExecutions
            };
            this.taskTypes.set(taskTypeName, workerTaskRuntimeDesc);
            for (let i = 0; i < maxParallelExecutions; i++) {
                workerTaskRuntimeDesc.workerStories.set(i, new WorkerTypeDefinition(taskTypeName, i, workerRegistration, this.verbose));
            }
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
        const executions = [];
        const workerTaskRuntimeDesc = this.taskTypes.get(taskTypeName);
        if (workerTaskRuntimeDesc) {
            for (const workerStory of workerTaskRuntimeDesc.workerStories.values()) {
                executions.push(workerStory.initWorker(payload, transferables));
            }
        }
        else {
            executions.push(new Promise((_resolve, reject) => {
                reject();
            }));
        }
        return Promise.all(executions);
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
        this.depleteWorkerExecutionPlans();
        return promise;
    }

    private buildWorkerExecutionPlanPromise(plan: WorkerExecutionPlan) {
        return new Promise((resolve, reject) => {
            plan.promiseFunctions = {
                resolve: resolve,
                reject: reject
            };
        });
    }

    private depleteWorkerExecutionPlans() {
        if (this.workerExecutionPlans.length === 0) {
            console.log('No more WorkerExecutionPlans in the queue.');
            return;
        }
        const plan = this.workerExecutionPlans.shift();
        if (plan) {
            const workerTaskRuntimeDesc = this.taskTypes.get(plan.taskTypeName);
            const workerStory = this.getUnusedWorkerStory(workerTaskRuntimeDesc);
            if (workerStory) {
                const promiseWorker = workerStory.executeWorker(plan);
                promiseWorker.then((message: unknown) => {
                    plan.promiseFunctions?.resolve(message);
                    this.depleteWorkerExecutionPlans();
                }).catch((e) => {
                    plan.promiseFunctions?.reject(new Error('Execution error: ' + e));
                    this.depleteWorkerExecutionPlans();
                });
            }
            else {
                this.workerExecutionPlans.unshift(plan);
            }
        }
    }

    private getUnusedWorkerStory(workerTaskRuntimeDesc: WorkerTaskRuntimeDesc | undefined) {
        if (workerTaskRuntimeDesc) {
            for (const workerStory of workerTaskRuntimeDesc.workerStories.values()) {
                if (!workerStory.isWorkerExecuting()) {
                    workerStory.markExecuting(true);
                    return workerStory;
                }
            }
        }
        return undefined;
    }

    /**
     * Destroys all workers and associated resources.
     * @return {WorkerTaskManager}
     */
    dispose() {
        for (const workerTaskRuntimeDesc of this.taskTypes.values()) {
            for (const workerStory of workerTaskRuntimeDesc.workerStories.values()) {
                workerStory.dispose();
            }
        }
        return this;
    }
}

/**
 * Defines a worker type: functions, dependencies and runtime information once it was created.
 */
export class WorkerTypeDefinition {

    private taskTypeName: string;
    private workerId: number;
    private verbose: boolean;

    private workerRegistration: WorkerRegistration = {
        module: true,
        blob: false,
        url: undefined
    };

    private worker: Worker | undefined;
    private executing = false;

    /**
     * Creates a new instance of {@link WorkerTypeDefinition}.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {WorkerRegistration} workerRegistration The name of the registered task type.
     * @param {boolean} [verbose] Set if logging should be verbose
     */
    constructor(taskTypeName: string, workerId: number, workerRegistration: WorkerRegistration, verbose?: boolean) {
        this.taskTypeName = taskTypeName;
        this.workerId = workerId;
        this.workerRegistration = workerRegistration;
        this.verbose = verbose === true;
    }

    isWorkerExecuting() {
        return this.executing;
    }

    markExecuting(executing: boolean) {
        this.executing = executing;
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

    async initWorker(payload: PayloadType, transferables?: Transferable[]) {
        return new Promise((resolve, reject) => {
            this.worker = this.createWorker();
            if (this.verbose) {
                console.log(`Task: ${this.taskTypeName}: Waiting for completion of initialization of all workers.`);
            }

            if (!this.worker) {
                reject(new Error('No worker was created before initWorker was called.'));
            }
            else {
                this.worker.onmessage = message => {
                    if (this.verbose) {
                        console.log(`Init Completed: ${payload.type}: ${message.data.id}`);
                    }
                    resolve(message);
                };
                this.worker.onerror = message => {
                    if (this.verbose) {
                        console.log(`Init Aborted: ${payload.type}: ${message.error}`);
                    }
                    reject(message);
                };
                payload.cmd = 'init';
                payload.workerId = this.workerId;
                if (transferables) {
                    // ensure all transferables are copies to all workers on init!
                    const transferablesToWorker = [];
                    for (const transferable of transferables) {
                        transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                    }
                    this.worker.postMessage(payload, transferablesToWorker);
                }
                else {
                    this.worker.postMessage(payload);
                }
            }
        });
    }

    private createWorker() {
        if (this.workerRegistration.url) {
            if (this.workerRegistration.blob) {
                return new Worker(this.workerRegistration.url);
            }
            else {
                const workerOptions = (this.workerRegistration.module ? { type: 'module' } : { type: 'classic' }) as WorkerOptions;
                return new Worker((this.workerRegistration.url as URL).href, workerOptions);
            }
        }
        return undefined;
    }

    executeWorker(plan: WorkerExecutionPlan) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Execution error: Worker is undefined.'));
            }
            else {
                this.markExecuting(true);
                this.worker.onmessage = message => {
                    // allow intermediate asset provision before flagging execComplete
                    if (message.data.cmd === 'intermediate') {
                        if (typeof plan.onIntermediate === 'function') {
                            plan.onIntermediate(message.data);
                        }
                    } else {
                        const completionMsg = `Execution Completed: ${plan.payload.type}: ${message.data.id}`;
                        if (this.verbose) {
                            console.log(completionMsg);
                        }
                        plan.onComplete((message as MessageEvent).data);
                        resolve(completionMsg);
                        this.markExecuting(false);
                    }
                };
                this.worker.onerror = message => {
                    if (this.verbose) {
                        console.log(`Execution Aborted: ${plan.payload.type}: ${message.error}`);
                    }
                    reject(message);
                    this.markExecuting(false);
                };
                plan.payload.cmd = 'execute';
                plan.payload.workerId = this.workerId;
                this.worker.postMessage(plan.payload, plan.transferables!);
            }
        });
    }

    dispose() {
        this.worker?.terminate();
    }

}

export type WorkerExecutionPlan = {
    taskTypeName: string;
    payload: PayloadType;
    onComplete: (data: PayloadType) => void;
    onIntermediate?: (data: PayloadType) => void;
    transferables?: Transferable[];
    promiseFunctions?: {
        resolve: (value: unknown) => void,
        reject: (reason?: unknown) => void | undefined
    };
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

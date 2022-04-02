
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
    private storedExecutions: StoredExecution[];

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
        this.storedExecutions = [];
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
     * @param {boolean} moduleWorker If the worker is a module or a standard worker
     * @param {URL} workerUrl The URL to be used for the Worker. Worker must provide logic to handle "init" and "execute" messages.
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
        const workerTypeDefinition = this.taskTypes.get(taskTypeName);
        if (workerTypeDefinition) {

            if (!workerTypeDefinition.getStatus().initStarted) {
                workerTypeDefinition.getStatus().initStarted = true;
                await workerTypeDefinition.createWorkers()
                    .then(() => workerTypeDefinition.initWorkers(payload, transferables))
                    .then(() => workerTypeDefinition.getStatus().initComplete = true)
                    .catch(e => console.error(e));
            }
            else {
                while (!((workerTypeDefinition as WorkerTypeDefinition).getStatus().initComplete)) {
                    await this.wait(10);
                }
            }
        }
    }

    private async wait(milliseconds: number) {
        return new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        });
    }

    /**
     * Queues a new task of the given type. Task will not execute until initialization completes.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {PayloadType} payload Configuration properties as serializable string.
     * @param {(data: unknown) => void} assetAvailableFunction Invoke this function if an asset become intermediately available
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     * @return {Promise}
     */
    async enqueueForExecution(taskTypeName: string, payload: PayloadType, assetAvailableFunction?: (data: PayloadType) => void, transferables?: Transferable[]) {
        const localPromise = new Promise((resolveUser, rejectUser) => {
            this.storedExecutions.push(new StoredExecution(taskTypeName, payload, resolveUser, rejectUser, assetAvailableFunction, transferables));
            this.depleteExecutions();
        });
        return localPromise;
    }

    private depleteExecutions() {
        let counter = 0;
        while (this.actualExecutionCount < this.maxParallelExecutions && counter < this.storedExecutions.length) {

            // TODO: storedExecutions and results from worker seem to get mixed up???
            const storedExecution = this.storedExecutions[counter];
            const workerTypeDefinition = this.taskTypes.get(storedExecution.taskTypeName);
            if (workerTypeDefinition) {
                const taskWorker = workerTypeDefinition.getAvailableTask();
                if (taskWorker) {
                    this.storedExecutions.splice(counter, 1);
                    this.actualExecutionCount++;

                    const promiseWorker = new Promise((resolveWorker, rejectWorker) => {
                        taskWorker.onmessage = message => {
                            // allow intermediate asset provision before flagging execComplete
                            if (message.data.cmd === 'assetAvailable') {
                                if (typeof storedExecution.assetAvailableFunction === 'function') {
                                    storedExecution.assetAvailableFunction(message.data);
                                }
                            } else {
                                resolveWorker(message);
                            }
                        };
                        taskWorker.onerror = rejectWorker;
                        storedExecution.payload.cmd = 'execute';
                        storedExecution.payload.workerId = taskWorker.getId();
                        taskWorker.postMessage(storedExecution.payload, storedExecution.transferables!);
                    });
                    promiseWorker.then((message: unknown) => {
                        workerTypeDefinition.returnAvailableTask(taskWorker);
                        storedExecution.resolve((message as MessageEvent).data);
                        this.actualExecutionCount--;
                        this.depleteExecutions();
                    }).catch((e) => {
                        storedExecution.reject(new Error('Execution error: ' + e));
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

type Status = {
    initStarted: boolean,
    initComplete: boolean
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
    private status: Status;

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

        this.status = {
            initStarted: false,
            initComplete: false
        };
    }

    static createWorkerBlob(code: string[]) {
        const simpleWorkerBlob = new Blob(code, { type: 'application/javascript' });
        return window.URL.createObjectURL(simpleWorkerBlob);
    }

    getTaskType() {
        return this.taskTypeName;
    }

    getStatus(): Status {
        return this.status;
    }

    /**
     * Creates module workers.
     *
     */
    async createWorkers() {
        if (this.workerRegistration.url) {
            for (let worker, i = 0; i < this.workers.instances.length; i++) {
                if (this.workerRegistration.blob) {
                    worker = new TaskWorker(i, this.workerRegistration.url);
                }
                else {
                    const workerOptions = (this.workerRegistration.module ? { type: 'module' } : { type: 'classic' }) as WorkerOptions;
                    worker = new TaskWorker(i, (this.workerRegistration.url as URL).href, workerOptions);
                }
                this.workers.instances[i] = worker;
            }
        }
    }

    /**
     * Initialises all workers with common configuration data.
     *
     * @param {PayloadType} payload
     * @param {Transferable[]} transferables
     */
    async initWorkers(payload: PayloadType, transferables?: Transferable[]): Promise<void> {
        const promises = [];
        for (const taskWorker of this.workers.instances) {

            const taskWorkerPromise = new Promise((resolveWorker, rejectWorker) => {
                taskWorker.onmessage = message => {
                    if (this.verbose) console.log(`Init Complete: ${payload.type}: ${message.data.id}`);
                    resolveWorker(message);
                };
                taskWorker.onerror = rejectWorker;
                payload.cmd = 'init';
                payload.workerId = taskWorker.getId();
                if (transferables) {
                    // ensure all transferables are copies to all workers on init!
                    const transferablesToWorker = [];
                    for (const transferable of transferables) {
                        transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                    }
                    taskWorker.postMessage(payload, transferablesToWorker);
                }
                else {
                    taskWorker.postMessage(payload);
                }
            });
            promises.push(taskWorkerPromise);
        }

        if (this.verbose) console.log('Task: ' + this.getTaskType() + ': Waiting for completion of initialization of all workers.');
        await Promise.all(promises);
        this.workers.available = this.workers.instances;
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
            taskWorker.terminate();
        }
    }

}

/**
 * Contains all things required for later executions of Worker.
 */
class StoredExecution {

    taskTypeName: string;
    payload: PayloadType;
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    assetAvailableFunction?: (data: PayloadType) => void;
    transferables?: Transferable[];

    constructor(taskTypeName: string, payload: PayloadType,
        resolve: (data: unknown) => void,
        reject: (error: Error) => void,
        assetAvailableFunction?: (data: PayloadType) => void,
        transferables?: Transferable[]) {
        this.taskTypeName = taskTypeName;
        this.payload = payload;
        this.resolve = resolve;
        this.reject = reject;
        this.assetAvailableFunction = assetAvailableFunction;
        this.transferables = transferables;
    }

}

/**
 * Extends the {@link Worker} with an id.
 */
class TaskWorker extends Worker {

    id: number;

    /**
     * Creates a new instance.
     *
     * @param {number} id Numerical id of the task.
     * @param {string} scriptURL
     * @param {WorkerOptions} [options]
     */
    constructor(id: number, scriptURL: string | URL, options?: WorkerOptions) {
        super(scriptURL, options);
        this.id = id;
    }

    /**
     * Returns the id.
     * @return {number}
     */
    getId() {
        return this.id;
    }

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

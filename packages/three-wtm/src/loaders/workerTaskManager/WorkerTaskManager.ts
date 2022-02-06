/* eslint-disable @typescript-eslint/ban-types */
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
     * @param {string} workerUrl The URL to be used for the Worker. Worker must provide logic to handle "init" and "execute" messages.
     * @return {boolean} Tells if registration is possible (new=true) or if task was already registered (existing=false)
     */
    registerTaskTypeWithUrl(taskTypeName: string, moduleWorker: boolean, workerUrl: string) {
        const allowedToRegister = !this.supportsTaskType(taskTypeName);
        if (allowedToRegister) {
            const workerTypeDefinition = new WorkerTypeDefinition(taskTypeName, this.maxParallelExecutions, this.verbose);
            workerTypeDefinition.setWorkerUrl(moduleWorker, workerUrl);
            this.taskTypes.set(taskTypeName, workerTypeDefinition);
        }
        return allowedToRegister;
    }

    /**
     * Provides initialization configuration and transferable objects.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {PayloadConfig} config Configuration properties as serializable string.
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     */
    async initTaskType(taskTypeName: string, config: PayloadConfig, transferables?: Transferable[]) {
        const workerTypeDefinition = this.taskTypes.get(taskTypeName);
        if (workerTypeDefinition) {

            if (!workerTypeDefinition.getStatus().initStarted) {
                workerTypeDefinition.getStatus().initStarted = true;
                if (workerTypeDefinition.haveWorkerUrl()) {
                    await workerTypeDefinition.createWorkerFromUrl(workerTypeDefinition.isWorkerModule())
                        .then(() => workerTypeDefinition.initWorkers(config, transferables))
                        .then(() => workerTypeDefinition.getStatus().initComplete = true)
                        .catch(e => console.error(e));
                }
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
     * @param {PayloadConfig} config Configuration properties as serializable string.
     * @param {Function} assetAvailableFunction Invoke this function if an asset become intermediately available
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     * @return {Promise}
     */
    async enqueueForExecution(taskTypeName: string, config: PayloadConfig, assetAvailableFunction?: Function, transferables?: Transferable[]) {
        const localPromise = new Promise((resolveUser, rejectUser) => {
            this.storedExecutions.push(new StoredExecution(taskTypeName, config, resolveUser, rejectUser, assetAvailableFunction, transferables));
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
                                if (storedExecution.assetAvailableFunction instanceof Function) {
                                    storedExecution.assetAvailableFunction(message.data);
                                }
                            } else {
                                resolveWorker(message);
                            }
                        };
                        taskWorker.onerror = rejectWorker;
                        taskWorker.postMessage({
                            cmd: 'execute',
                            workerId: taskWorker.getId(),
                            config: storedExecution.config
                        }, storedExecution.transferables!);
                    });
                    promiseWorker.then((message: unknown) => {
                        workerTypeDefinition.returnAvailableTask(taskWorker);
                        storedExecution.resolve((message as MessageEvent).data);
                        this.actualExecutionCount--;
                        this.depleteExecutions();
                    }).catch((e) => {
                        storedExecution.reject('Execution error: ' + e);
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
class WorkerTypeDefinition {

    private taskTypeName: string;
    private verbose: boolean;

    private moduleWorker = false;
    private workerUrl: URL | undefined = undefined;

    private workers: Workers;
    private status: Status;

    /**
     * Creates a new instance of {@link WorkerTypeDefinition}.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {Number} maximumCount Maximum worker count
     * @param {boolean} [verbose] Set if logging should be verbose
     */
    constructor(taskTypeName: string, maximumCount: number, verbose: boolean) {
        this.taskTypeName = taskTypeName;
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

    getTaskType() {
        return this.taskTypeName;
    }

    getStatus(): Status {
        return this.status;
    }
    /**
     * Set the url of the module worker.
     *
     * @param {boolean} moduleWorker If the worker is a module or a standard worker
     * @param {string} workerUrl The URL is created from this string.
     */
    setWorkerUrl(moduleWorker: boolean, workerUrl: string) {
        this.moduleWorker = moduleWorker;
        this.workerUrl = new URL(workerUrl, window.location.href);
    }

    /**
     * Is it a module worker?
     *
     * @return {boolean} True or false
     */
    isWorkerModule() {
        return (this.moduleWorker && this.haveWorkerUrl());
    }

    /**
     * If a URL for a worker was provided
     *
     * @returns {boolean} True or false
     */
    haveWorkerUrl() {
        return (this.workerUrl !== null);
    }

    /**
     * Creates module workers.
     *
     */
    async createWorkerFromUrl(module: boolean) {
        if (this.workerUrl) {
            for (let worker, i = 0; i < this.workers.instances.length; i++) {
                if (module) {
                    worker = new TaskWorker(i, this.workerUrl.href, { type: 'module' });
                }
                else {
                    worker = new TaskWorker(i, this.workerUrl.href);
                }
                this.workers.instances[i] = worker;
            }
        }
    }

    /**
     * Initialises all workers with common configuration data.
     *
     * @param {PayloadConfig} config
     * @param {Transferable[]} transferables
     */
    async initWorkers(config: PayloadConfig, transferables?: Transferable[]) {
        const promises = [];
        for (const taskWorker of this.workers.instances) {

            const taskWorkerPromise = new Promise((resolveWorker, rejectWorker) => {
                taskWorker.onmessage = message => {
                    if (this.verbose) console.log(`Init Complete: ${config.name}: ${message.data.id}`);
                    resolveWorker(message);
                };
                taskWorker.onerror = rejectWorker;
                const message = {
                    cmd: 'init',
                    workerId: taskWorker.getId(),
                    config: config
                };
                if (transferables) {
                    // ensure all transferables are copies to all workers on init!
                    const transferablesToWorker = transferables.slice(0, transferables.length);
                    taskWorker.postMessage(message, transferablesToWorker);
                }
                else {
                    taskWorker.postMessage(message);
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
    config: PayloadConfig;
    resolve: Function;
    reject: Function;
    assetAvailableFunction?: Function;
    transferables?: Transferable[];

    constructor(taskTypeName: string, config: PayloadConfig, resolve: Function, reject: Function, assetAvailableFunction?: Function, transferables?: Transferable[]) {
        this.taskTypeName = taskTypeName;
        this.config = config;
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
     * @param {object} [options]
     */
    constructor(id: number, scriptURL: string | URL, options?: WorkerOptions | undefined) {
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

type Payload = {
    cmd: string,
    id: string,
    workerId: string,
    config: PayloadConfig
}

type PayloadConfig = {
    name: string,
    id: string
}

interface WorkerTaskManagerWorker {

    init(workerId: string, config: PayloadConfig): void;

    execute(workerId: string, config: PayloadConfig): void;

    comRouting(message: never): void;

}

class WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {

    init(workerId: string, config: PayloadConfig): void {
        console.log(`WorkerTaskManagerDefaultWorker#init: workerId: ${workerId} config: ${config}`);
    }

    execute(workerId: string, config: PayloadConfig): void {
        console.log(`WorkerTaskManagerDefaultWorker#execute: workerId: ${workerId} config: ${config}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comRouting(message: MessageEvent<any>) {
        const payload = (message as MessageEvent).data as Payload;
        if (payload.cmd === 'init') {
            this.init(payload.workerId, payload.config);
        }
        else if (payload.cmd === 'execute') {
            this.execute(payload.workerId, payload.config);
        }
    }
}

export { WorkerTaskManager, Payload, PayloadConfig, WorkerTaskManagerWorker, WorkerTaskManagerDefaultWorker };

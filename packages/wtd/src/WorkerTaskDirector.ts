import {
    PayloadType,
    WorkerExecutionPlan,
    WorkerRegistration,
    WorkerTask
} from './WorkerTask';

type WorkerTaskRuntimeDesc = {
    workerStories: Map<number, WorkerTask>;
    readonly maxParallelExecutions: number;
}

/**
 * Register one to many tasks type to the WorkerTaskDirector. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The WorkerTaskDirector allows to execute a maximum number of executions in parallel.
 *
 * Initial idea by Don McCurdy / https://www.donmccurdy.com / https://github.com/mrdoob/three.js/issues/18234
 */
export class WorkerTaskDirector {

    private taskTypes: Map<string, WorkerTaskRuntimeDesc>;
    private verbose: boolean;
    private defaultMaxParallelExecutions: number;
    private workerExecutionPlans: Map<string, WorkerExecutionPlan[]>;

    /**
     * Creates a new WorkerTaskDirector instance.
     *
     * @param {number} [defaultMaxParallelExecutions] How many workers are allowed to be executed in parallel.
     */
    constructor(defaultMaxParallelExecutions?: number) {
        this.taskTypes = new Map();
        this.verbose = false;
        this.defaultMaxParallelExecutions = defaultMaxParallelExecutions ?? 4;
        this.workerExecutionPlans = new Map();
    }

    /**
     * Set if logging should be verbose
     *
     * @param {boolean} verbose
     * @return {WorkerTaskDirector}
     */
    setVerbose(verbose: boolean) {
        this.verbose = verbose;
        return this;
    }

    getDefaultMaxParallelExecutions() {
        return this.defaultMaxParallelExecutions;
    }

    setDefaultMaxParallelExecutions(defaultMaxParallelExecutions: number) {
        this.defaultMaxParallelExecutions = defaultMaxParallelExecutions;
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
                workerTaskRuntimeDesc.workerStories.set(i, new WorkerTask(taskTypeName, i, workerRegistration, this.verbose));
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
            for (const workerTask of workerTaskRuntimeDesc.workerStories.values()) {
                executions.push(workerTask.initWorker(payload, transferables));
            }
            this.workerExecutionPlans.set(taskTypeName, []);
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
        const planForType = this.workerExecutionPlans.get(plan.taskTypeName);
        planForType?.push(plan);
        this.depleteWorkerExecutionPlans(plan.taskTypeName);
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

    private depleteWorkerExecutionPlans(taskTypeName: string) {
        const planForType = this.workerExecutionPlans.get(taskTypeName);
        if (planForType?.length === 0) {
            if (this.verbose) {
                console.log(`No more WorkerExecutionPlans in the queue for: ${taskTypeName}`);
            }
            return;
        }
        const plan = planForType?.shift();
        if (plan) {
            const workerTaskRuntimeDesc = this.taskTypes.get(plan.taskTypeName);
            const workerTask = this.getUnusedWorkerTask(workerTaskRuntimeDesc);
            if (workerTask) {
                const promiseWorker = workerTask.executeWorker(plan);
                promiseWorker.then((message: unknown) => {
                    plan.promiseFunctions?.resolve(message);
                    this.depleteWorkerExecutionPlans(taskTypeName);
                }).catch((e) => {
                    plan.promiseFunctions?.reject(new Error('Execution error: ' + e));
                    this.depleteWorkerExecutionPlans(taskTypeName);
                });
            }
            else {
                planForType?.unshift(plan);
            }
        }
    }

    private getUnusedWorkerTask(workerTaskRuntimeDesc: WorkerTaskRuntimeDesc | undefined) {
        if (workerTaskRuntimeDesc) {
            for (const workerTask of workerTaskRuntimeDesc.workerStories.values()) {
                if (!workerTask.isWorkerExecuting()) {
                    workerTask.markExecuting(true);
                    return workerTask;
                }
            }
        }
        return undefined;
    }

    /**
     * Destroys all workers and associated resources.
     * @return {WorkerTaskDirector}
     */
    dispose() {
        for (const workerTaskRuntimeDesc of this.taskTypes.values()) {
            for (const workerTask of workerTaskRuntimeDesc.workerStories.values()) {
                workerTask.dispose();
            }
        }
        return this;
    }
}

export interface WorkerTaskDirectorWorker {

    init(payload: PayloadType): void;

    execute(payload: PayloadType): void;

    comRouting(message: never): void;

}

export class WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(payload: PayloadType): void {
        console.log(`WorkerTaskDirectorDefaultWorker#init: name: ${payload.type} id: ${payload.id} workerId: ${payload.workerId}`);
    }

    execute(payload: PayloadType): void {
        console.log(`WorkerTaskDirectorDefaultWorker#execute: name: ${payload.type} id: ${payload.id} workerId: ${payload.workerId}`);
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

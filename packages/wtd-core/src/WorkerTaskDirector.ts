import {
    WorkerTaskMessage,
    WorkerTaskMessageType
} from './WorkerTaskMessage';
import {
    WorkerExecutionPlan,
    WorkerRegistration,
    WorkerTask
} from './WorkerTask';

type WorkerTaskRuntimeDesc = {
    workerStories: Map<number, WorkerTask>;
    readonly maxParallelExecutions: number;
}

type WorkerTaskDirectorConfig = {
    defaultMaxParallelExecutions: number;
    verbose: boolean;
}

/**
 * Register one to many tasks type to the WorkerTaskDirector. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The WorkerTaskDirector allows to execute a maximum number of executions in parallel.
 *
 * Initial idea by Don McCurdy / https://www.donmccurdy.com / https://github.com/mrdoob/three.js/issues/18234
 */
export class WorkerTaskDirector {

    static DEFAULT_MAX_PARALLEL_EXECUTIONS = 4;

    private config: WorkerTaskDirectorConfig = {
        defaultMaxParallelExecutions: WorkerTaskDirector.DEFAULT_MAX_PARALLEL_EXECUTIONS,
        verbose: false
    };
    private taskTypes: Map<string, WorkerTaskRuntimeDesc>;
    private workerExecutionPlans: Map<string, WorkerExecutionPlan[]>;

    /**
     * Creates a new WorkerTaskDirector instance.
     *
     * @param {WorkerTaskDirectorConfig} [config] configuration options
     */
    constructor(config?: WorkerTaskDirectorConfig) {
        if (config) {
            this.config.defaultMaxParallelExecutions = config.defaultMaxParallelExecutions;
            this.config.verbose = config.verbose === true;
        }
        this.taskTypes = new Map();
        this.workerExecutionPlans = new Map();
    }

    /**
     * Registers functionality for a new task type based on module file.
     *
     * @param {string} taskTypeName The name to be used for registration.
     * @param {WorkerRegistration} workerRegistration
     * @return {boolean} Tells if registration is possible (new=true) or if task was already registered (existing=false)
     */
    registerTask(taskTypeName: string, workerRegistration: WorkerRegistration, maxParallelExecutions?: number) {
        const allowedToRegister = !this.taskTypes.has(taskTypeName);
        if (allowedToRegister) {
            maxParallelExecutions = maxParallelExecutions ?? this.config.defaultMaxParallelExecutions;
            const workerTaskRuntimeDesc: WorkerTaskRuntimeDesc = {
                workerStories: new Map(),
                maxParallelExecutions: maxParallelExecutions
            };
            this.taskTypes.set(taskTypeName, workerTaskRuntimeDesc);
            for (let i = 0; i < maxParallelExecutions; i++) {
                workerTaskRuntimeDesc.workerStories.set(i, new WorkerTask(taskTypeName, i, workerRegistration, this.config.verbose));
            }
        }
        return allowedToRegister;
    }

    /**
     * Provides initialization configuration and transferable objects.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {WorkerTaskMessage} [message] Optional intt message to be sent
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     */
    async initTaskType(taskTypeName: string, message?: WorkerTaskMessage, transferables?: Transferable[]) {
        const executions = [];
        const workerTaskRuntimeDesc = this.taskTypes.get(taskTypeName);
        if (workerTaskRuntimeDesc) {
            this.workerExecutionPlans.set(taskTypeName, []);
            for (const workerTask of workerTaskRuntimeDesc.workerStories.values()) {
                executions.push(workerTask.initWorker(message, transferables));
            }
        }
        else {
            executions.push(new Promise<void>((_resolve, reject) => {
                reject();
            }));
        }
        if (executions.length === 0) {
            executions.push(new Promise<void>((resolve, _reject) => {
                resolve();
            }));
        }
        return Promise.all(executions);
    }

    /**
     * Queues a new task of the given type. Task will not execute until initialization completes.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {WorkerTaskMessage} message Configuration properties as serializable string.
     * @param {(data: PayloadType) => void} onComplete Invoke this function if everything is completed
     * @param {(data: PayloadType) => void} onIntermediate Invoke this function if an asset become intermediately available
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     * @return {Promise}
     */
    async enqueueForExecution(taskTypeName: string, message: WorkerTaskMessage, onComplete: (message: WorkerTaskMessageType) => void,
        onIntermediate?: (message: WorkerTaskMessageType) => void, transferables?: Transferable[]) {
        const plan = {
            taskTypeName: taskTypeName,
            message: message,
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
            if (this.config.verbose) {
                console.log(`No more WorkerExecutionPlans in the queue for: ${taskTypeName}`);
            }
            return;
        }
        const plan = planForType?.shift();
        if (plan) {
            const workerTaskRuntimeDesc = this.taskTypes.get(plan.taskTypeName);
            const workerTask = this.getUnusedWorkerTask(workerTaskRuntimeDesc);
            if (workerTask) {
                workerTask.executeWorker(plan).then((message: unknown) => {
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

    init(message: WorkerTaskMessageType): void;

    execute(message: WorkerTaskMessageType): void;

    comRouting(message: never): void;

}

export class WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(message: WorkerTaskMessageType): void {
        console.log(`WorkerTaskDirectorDefaultWorker#init: name: ${message.name} id: ${message.id} workerId: ${message.workerId}`);
    }

    execute(message: WorkerTaskMessageType): void {
        console.log(`WorkerTaskDirectorDefaultWorker#execute: name: ${message.name} id: ${message.id} workerId: ${message.workerId}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    comRouting(message: MessageEvent<any>) {
        const wtmt = (message as MessageEvent).data as WorkerTaskMessageType;
        if (wtmt) {
            if (wtmt.cmd === 'init') {
                this.init(wtmt);
            }
            else if (wtmt.cmd === 'execute') {
                this.execute(wtmt);
            }
        }
    }
}

import type {
    WorkerTaskMessageConfig
} from './WorkerTaskMessage.js';
import {
    WorkerTaskMessage
} from './WorkerTaskMessage.js';
import type {
    WorkerExecutionPlan,
    WorkerInitPlan,
    WorkerConfig,
    WorkerConfigDirect
} from './WorkerTask.js';
import {
    WorkerTask
} from './WorkerTask.js';

type WorkerTaskRuntimeDesc = {
    workerTasks: Map<number, WorkerTask>;
    readonly maxParallelExecutions: number;
}

type WorkerTaskDirectorConfig = {
    defaultMaxParallelExecutions: number;
    verbose: boolean;
}

/**
 * Register one to many tasks type to the WorkerTaskDirector. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The WorkerTaskDirector allows to execute a maximum number of executions in parallel for
 * each registered worker task.
 */
export class WorkerTaskDirector {

    static DEFAULT_MAX_PARALLEL_EXECUTIONS = 4;

    private config: WorkerTaskDirectorConfig = {
        defaultMaxParallelExecutions: WorkerTaskDirector.DEFAULT_MAX_PARALLEL_EXECUTIONS,
        verbose: false
    };
    private taskTypes: Map<string, WorkerTaskRuntimeDesc>;
    private workerExecutionPlans: Map<string, WorkerExecutionPlan[]>;

    constructor(config?: WorkerTaskDirectorConfig) {
        if (config) {
            this.config.defaultMaxParallelExecutions = config.defaultMaxParallelExecutions;
            this.config.verbose = config.verbose === true;
        }
        this.taskTypes = new Map();
        this.workerExecutionPlans = new Map();
    }

    /**
     * Registers functionality for a new task type based on workerRegistration info
     *
     * @param {string} taskTypeName The name to be used for registration.
     * @param {WorkerConfig | WorkerConfigDirect} workerConfig information regarding the worker to be registered
     * @param {number} maxParallelExecutions Number of maximum parallel executions allowed
     * @return {boolean} Tells if registration is possible (new=true) or if task was already registered (existing=false)
     */
    registerTask(taskTypeName: string, workerConfig: WorkerConfig | WorkerConfigDirect, maxParallelExecutions?: number) {
        const allowedToRegister = !this.taskTypes.has(taskTypeName);
        if (allowedToRegister) {
            maxParallelExecutions = maxParallelExecutions ?? this.config.defaultMaxParallelExecutions;
            const workerTaskRuntimeDesc: WorkerTaskRuntimeDesc = {
                workerTasks: new Map(),
                maxParallelExecutions: maxParallelExecutions
            };
            this.taskTypes.set(taskTypeName, workerTaskRuntimeDesc);
            for (let i = 0; i < maxParallelExecutions; i++) {
                workerTaskRuntimeDesc.workerTasks.set(i, new WorkerTask(taskTypeName, i, workerConfig, this.config.verbose));
            }
        }
        return allowedToRegister;
    }

    /**
     * Provides initialization configuration and transferable objects.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {WorkerInitPlan} [plan] Initialization instructions.
     */
    async initTaskType(taskTypeName: string, plan?: WorkerInitPlan) {
        const executions = [];
        const workerTaskRuntimeDesc = this.taskTypes.get(taskTypeName);
        if (workerTaskRuntimeDesc) {
            this.workerExecutionPlans.set(taskTypeName, []);
            for (const workerTask of workerTaskRuntimeDesc.workerTasks.values()) {
                executions.push(workerTask.initWorker({
                    message: plan?.message,
                    transferables: plan?.transferables,
                    copyTransferables: plan?.copyTransferables
                }));
            }
        } else {
            executions.push(Promise.reject());
        }
        if (executions.length === 0) {
            executions.push(Promise.resolve());
        }
        return Promise.all(executions);
    }

    /**
     * Queues a new task of the given type. Task will not execute until initialization completes.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {WorkerTaskMessage} message Configuration properties as serializable string.
     * @param {(message: WorkerTaskMessageConfig) => void} onComplete Invoke this function if everything is completed
     * @param {(message: WorkerTaskMessageConfig) => void} onIntermediateConfirm Invoke this function if an asset become intermediately available
     * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
     * @return {Promise}
     */
    async enqueueForExecution(taskTypeName: string, message: WorkerTaskMessage, onComplete: (message: WorkerTaskMessageConfig) => void,
        onIntermediateConfirm?: (message: WorkerTaskMessageConfig) => void, transferables?: Transferable[], copyTransferables?: boolean) {
        return this.enqueueWorkerExecutionPlan(taskTypeName, {
            message,
            onComplete,
            onIntermediateConfirm,
            transferables,
            copyTransferables
        });
    }

    async enqueueWorkerExecutionPlan(taskTypeName: string, plan: WorkerExecutionPlan) {
        const promise = this.buildWorkerExecutionPlanPromise(plan);
        const planForType = this.workerExecutionPlans.get(taskTypeName);
        planForType?.push(plan);
        this.depleteWorkerExecutionPlans(taskTypeName);
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

    private async depleteWorkerExecutionPlans(taskTypeName: string) {
        const planForType = this.workerExecutionPlans.get(taskTypeName);
        if (planForType?.length === 0) {
            if (this.config.verbose) {
                console.log(`No more WorkerExecutionPlans in the queue for: ${taskTypeName}`);
            }
            return;
        }
        const plan = planForType?.shift();
        if (plan) {
            const workerTaskRuntimeDesc = this.taskTypes.get(taskTypeName);
            const workerTask = this.getUnusedWorkerTask(workerTaskRuntimeDesc);
            if (workerTask) {
                try {
                    const result = await workerTask.executeWorker(plan);
                    plan.promiseFunctions?.resolve(result);
                    this.depleteWorkerExecutionPlans(taskTypeName);
                } catch (e) {
                    plan.promiseFunctions?.reject(new Error('Execution error: ' + e));
                    this.depleteWorkerExecutionPlans(taskTypeName);
                }
            }
            else {
                planForType?.unshift(plan);
            }
        }
    }

    private getUnusedWorkerTask(workerTaskRuntimeDesc: WorkerTaskRuntimeDesc | undefined) {
        if (workerTaskRuntimeDesc) {
            for (const workerTask of workerTaskRuntimeDesc.workerTasks.values()) {
                if (!workerTask.isWorkerExecuting()) {
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
            for (const workerTask of workerTaskRuntimeDesc.workerTasks.values()) {
                workerTask.dispose();
            }
        }
        return this;
    }
}

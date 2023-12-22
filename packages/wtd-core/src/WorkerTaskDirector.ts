import {
    WorkerTaskMessage
} from './WorkerTaskMessage.js';
import type {
    WorkerConfig,
    WorkerConfigDirect,
    WorkerExecutionDef,
    WorkerMessageDef
} from './WorkerTask.js';
import {
    WorkerTask
} from './WorkerTask.js';

type WorkerTaskRuntimeDesc = {
    workerTasks: Map<number, WorkerTask>;
    readonly maxParallelExecutions: number;
}

type WorkerTaskDirectorConfig = {
    defaultMaxParallelExecutions?: number;
    verbose?: boolean;
}

/**
 * This is only used internally
 */
type WorkerExecutionPlan = WorkerExecutionDef & {
    promiseFunctions?: {
        resolve: (message: WorkerTaskMessage) => void,
        reject: (error?: Error) => void
    };
};

export type WorkerTaskDirectorTaskDef = {
    taskName: string;
    workerConfig: WorkerConfig | WorkerConfigDirect;
    maxParallelExecutions?: number
};

/**
 * Register one to many tasks type to the WorkerTaskDirector. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The WorkerTaskDirector allows to execute a maximum number of executions in parallel for
 * each registered worker task.
 */
export class WorkerTaskDirector {

    static DEFAULT_MAX_PARALLEL_EXECUTIONS = 4;

    private defaultMaxParallelExecutions: number;
    private verbose = false;
    private taskTypes: Map<string, WorkerTaskRuntimeDesc>;
    private workerExecutionPlans: Map<string, WorkerExecutionPlan[]>;

    constructor(config?: WorkerTaskDirectorConfig) {
        this.defaultMaxParallelExecutions = config?.defaultMaxParallelExecutions ?? WorkerTaskDirector.DEFAULT_MAX_PARALLEL_EXECUTIONS;
        this.verbose = config?.verbose === true;
        this.taskTypes = new Map();
        this.workerExecutionPlans = new Map();
    }

    /**
     * Registers functionality for a new task type based on workerRegistration info
     *
     * @param {string} taskName The name to be used for registration.
     * @param {WorkerConfig | WorkerConfigDirect} workerConfig information regarding the worker to be registered
     * @param {number} maxParallelExecutions Number of maximum parallel executions allowed
     * @return {boolean} Tells if registration is possible (new=true) or if task was already registered (existing=false)
     */
    registerTask(workerTaskDirectorDef: WorkerTaskDirectorTaskDef) {
        const taskName = workerTaskDirectorDef.taskName;
        const allowedToRegister = !this.taskTypes.has(taskName);
        if (allowedToRegister) {
            const maxParallelExecutions = workerTaskDirectorDef.maxParallelExecutions ?? this.defaultMaxParallelExecutions;
            const workerTaskRuntimeDesc: WorkerTaskRuntimeDesc = {
                workerTasks: new Map(),
                maxParallelExecutions: maxParallelExecutions
            };
            this.taskTypes.set(taskName, workerTaskRuntimeDesc);
            for (let i = 0; i < maxParallelExecutions; i++) {
                workerTaskRuntimeDesc.workerTasks.set(i, new WorkerTask({
                    taskName,
                    workerId: i,
                    workerConfig: workerTaskDirectorDef.workerConfig,
                    verbose: this.verbose
                }));
            }
        }
        return allowedToRegister;
    }

    /**
     * Provides initialization configuration and transferable objects.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {WorkerMessageDef} [def] Initialization instructions.
     */
    async initTaskType(taskTypeName: string, def?: WorkerMessageDef) {
        const executions = [];
        const workerTaskRuntimeDesc = this.taskTypes.get(taskTypeName);
        if (workerTaskRuntimeDesc) {
            this.workerExecutionPlans.set(taskTypeName, []);
            for (const workerTask of workerTaskRuntimeDesc.workerTasks.values()) {
                // only init worker if a def is provided
                workerTask.connectWorker();
                if (def) {
                    executions.push(workerTask.initWorker({
                        message: def.message,
                        transferables: def.transferables,
                        copyTransferables: def.copyTransferables === true
                    }));
                }
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
     * @param {WorkerExecutionDef} Defines all the information needed to execute the worker task.
     * @return {Promise}
     */
    async enqueueForExecution(taskTypeName: string, workerExecutionDef: WorkerExecutionDef): Promise<WorkerTaskMessage> {
        const plan = workerExecutionDef as WorkerExecutionPlan;
        const promise = new Promise((resolve, reject) => {
            plan.promiseFunctions = {
                resolve: resolve,
                reject: reject
            };
        }) as Promise<WorkerTaskMessage>;

        const planForType = this.workerExecutionPlans.get(taskTypeName);
        planForType?.push(plan);
        this.depleteWorkerExecutionPlans(taskTypeName);
        return promise;
    }

    private async depleteWorkerExecutionPlans(taskTypeName: string) {
        const planForType = this.workerExecutionPlans.get(taskTypeName);
        if (planForType?.length === 0) {
            if (this.verbose) {
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

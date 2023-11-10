import type {
    WorkerTaskMessageType
} from './WorkerTaskMessage.js';
import {
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerTaskMessage
} from './WorkerTaskMessage.js';

export type WorkerRegistration = {
    module: boolean;
    blob: boolean;
    url: URL | string | undefined;
}

export type WorkerInitPlan = {
    message?: WorkerTaskMessage;
    transferables?: Transferable[];
    copyTransferables?: boolean;
}

export type WorkerExecutionPlan = {
    message: WorkerTaskMessage;
    onComplete: (message: WorkerTaskMessageType) => void;
    onIntermediateConfirm?: (message: WorkerTaskMessageType) => void;
    transferables?: Transferable[];
    copyTransferables?: boolean;
    promiseFunctions?: {
        resolve: (value: unknown) => void,
        reject: (reason?: unknown) => void | undefined
    };
}

export class WorkerTask {

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

    async initWorker(plan: WorkerInitPlan) {
        return new Promise((resolve, reject) => {
            this.worker = this.createWorker();
            if (this.verbose) {
                console.log(`Task: ${this.taskTypeName}: Waiting for completion of initialization of all workers.`);
            }

            if (!this.worker) {
                reject(new Error('No worker was created before initWorker was called.'));
            }
            else {
                const message = plan.message;
                if (!message) {
                    resolve('WorkerTask#initWorker: No Payload provided => No init required');
                    return;
                }
                this.worker.addEventListener('message', async (answer) => {
                    // only process WorkerTaskMessage
                    if (answer.data.cmd) {
                        if (this.verbose) {
                            console.log(`Init Completed: ${message.name}: ${answer.data.id}`);
                        }
                        resolve(answer);
                    }
                });
                this.worker.addEventListener('error', async (answer) => {
                    if (this.verbose) {
                        console.log(`Init Aborted: ${message.name}: ${answer.error}`);
                    }
                    reject(answer);
                });
                message.cmd = WorkerTaskCommandRequest.INIT;
                message.workerId = this.workerId;
                if (plan.transferables) {
                    // copy transferables if wanted
                    if (plan.copyTransferables === true) {
                        const transferablesToWorker = [];
                        for (const transferable of plan.transferables) {
                            transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                        }
                        this.worker.postMessage(message, transferablesToWorker);
                    } else {
                        this.worker.postMessage(message, plan.transferables);
                    }
                }
                else {
                    this.worker.postMessage(message);
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
                this.worker.addEventListener('message', async (answer) => {
                    // only process WorkerTaskMessage
                    if (answer.data.cmd) {
                        // allow intermediate asset provision before flagging execComplete
                        if (answer.data.cmd === WorkerTaskCommandResponse.INTERMEDIATE_CONFIRM) {
                            if (typeof plan.onIntermediateConfirm === 'function') {
                                plan.onIntermediateConfirm(answer.data);
                            }
                        } else {
                            const completionMsg = `Execution Completed: ${plan.message.name}: ${answer.data.id}`;
                            if (this.verbose) {
                                console.log(completionMsg);
                            }
                            plan.onComplete((answer as MessageEvent).data);
                            resolve(completionMsg);
                            this.markExecuting(false);
                        }
                    }
                });
                this.worker.addEventListener('error', async (answer) => {
                    if (this.verbose) {
                        console.log(`Execution Aborted: ${plan.message.name}: ${answer.error}`);
                    }
                    reject(answer);
                    this.markExecuting(false);
                });
                plan.message.cmd = WorkerTaskCommandRequest.EXECUTE;
                plan.message.workerId = this.workerId;
                if (plan.transferables) {
                    this.worker.postMessage(plan.message, plan.transferables);
                } else {
                    this.worker.postMessage(plan.message);
                }
            }
        });
    }

    /**
     * This is only possible if the worker is already executing.
     * @param message
     * @param transferables
     */
    sentMessage(message: WorkerTaskMessage, transferables?: Transferable[]) {
        if (this.isWorkerExecuting() && this.worker) {
            message.cmd = WorkerTaskCommandRequest.INTERMEDIATE;
            message.workerId = this.workerId;
            this.worker.postMessage(message, transferables!);
        }

    }

    dispose() {
        this.worker?.terminate();
    }

}

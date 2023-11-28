import type {
    WorkerTaskMessageConfig
} from './WorkerTaskMessage.js';
import {
    WorkerTaskMessage
} from './WorkerTaskMessage.js';
import { WorkerTaskCommandRequest, WorkerTaskCommandResponse } from './WorkerTaskWorker.js';
import { extractDelegate } from './utilities.js';

export type WorkerConfig = {
    $type: 'WorkerConfigParams'
    workerType: 'classic' | 'module';
    blob?: boolean;
    url: URL | string | undefined;
}

export type WorkerConfigDirect = {
    $type: 'WorkerConfigDirect';
    worker: Worker;
};

export type WorkerMessageDef = {
    message: WorkerTaskMessage;
    transferables?: Transferable[];
    copyTransferables?: boolean;
};

export type WorkerInitMessageDef = WorkerMessageDef & {
    delegate?: boolean;
}

export type WorkerExecutionDef = {
    message: WorkerTaskMessage;
    onComplete: (message: WorkerTaskMessageConfig) => void;
    onIntermediateConfirm?: (message: WorkerTaskMessageConfig) => void;
    transferables?: Transferable[];
    copyTransferables?: boolean;
    promiseFunctions?: {
        resolve: (value: unknown) => void,
        reject: (reason?: unknown) => void | undefined
    };
    delegate?: true;
}

export class WorkerTask {

    private taskTypeName: string;
    private workerId: number;
    private verbose: boolean;

    private workerConfig: WorkerConfig | WorkerConfigDirect;

    private worker?: Worker;
    private executing = false;

    constructor(taskTypeName: string, workerId: number, workerConfig: WorkerConfig | WorkerConfigDirect, verbose?: boolean) {
        this.taskTypeName = taskTypeName;
        this.workerId = workerId;
        this.workerConfig = workerConfig;
        this.verbose = verbose === true;
    }

    isWorkerExecuting() {
        return this.executing;
    }

    markExecuting(executing: boolean) {
        this.executing = executing;
    }

    getWorker() {
        return this.worker;
    }

    async initWorker(plan: WorkerInitMessageDef) {
        this.createWorker();

        return new Promise((resolve, reject) => {
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
                const delegate = (plan.delegate === true) ? extractDelegate(this.worker) : undefined;
                this.worker.onmessage = (async (answer) => {
                    // only process WorkerTaskMessage
                    if (answer.data.cmd) {
                        if (this.verbose) {
                            console.log(`Init Completed: ${message.name}: ${answer.data.id}`);
                        }
                        resolve(answer);
                    } else {
                        delegate?.(answer);
                    }
                });
                this.worker.onerror = (async (answer) => {
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

    createWorker() {
        if (this.workerConfig.$type === 'WorkerConfigDirect') {
            this.worker = this.workerConfig.worker;
        } else if (this.workerConfig.$type === 'WorkerConfigParams') {
            if (this.workerConfig.url) {
                if (this.workerConfig.blob) {
                    this.worker = new Worker(this.workerConfig.url);
                }
                else {
                    this.worker = new Worker((this.workerConfig.url as URL).href, {
                        type: this.workerConfig.workerType
                    });
                }
            }
        }
    }

    async executeWorker(plan: WorkerExecutionDef) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Execution error: Worker is undefined.'));
            }
            else {
                this.markExecuting(true);
                const delegate = (plan.delegate === true) ? extractDelegate(this.worker) : undefined;
                this.worker.onmessage = (async (answer) => {
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
                    } else {
                        delegate?.(answer);
                    }
                });
                this.worker.onerror = (async (answer) => {
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
     * This is only possible if the worker is available.
     */
    sentMessage(plan: WorkerMessageDef) {
        if (this.worker) {
            const message = plan.message;
            message.workerId = this.workerId;
            if (plan.transferables) {
                if (plan.copyTransferables === true) {
                    const transferablesToWorker = [];
                    for (const transferable of plan.transferables) {
                        transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                    }
                    this.worker.postMessage(message, transferablesToWorker);
                } else {
                    this.worker.postMessage(message, plan.transferables);
                }
            } else {
                this.worker.postMessage(message);
            }
        } else {
            throw new Error('You can only sent message if the worker is available.');
        }
    }

    dispose() {
        this.worker?.terminate();
    }

}

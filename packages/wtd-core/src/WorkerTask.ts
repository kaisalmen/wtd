import {
    WorkerTaskMessage
} from './WorkerTaskMessage.js';
import { WorkerTaskCommandRequest, WorkerTaskCommandResponse } from './WorkerTaskWorker.js';

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

export type WorkerIntermediateMessageDef = WorkerMessageDef & {
    answer?: string;
    awaitAnswer?: boolean;
}

export type WorkerExecutionDef = {
    message: WorkerTaskMessage;
    onComplete?: (message: WorkerTaskMessage) => void;
    onIntermediateConfirm?: (message: WorkerTaskMessage) => void;
    transferables?: Transferable[];
    copyTransferables?: boolean;
}

export type WorkerTaskConfig = {
    taskName: string;
    workerId: number;
    workerConfig: WorkerConfig | WorkerConfigDirect;
    verbose?: boolean;
}

type AwaitHandler = {
    name: string;
    resolve: Array<(wtm: WorkerTaskMessage) => void>;
    reject: (error: Error) => void;
    remove: boolean;
    log: boolean;
    endExecution?: boolean;
}

export class WorkerTask {

    private taskName: string;
    private workerId: number;
    private workerConfig: WorkerConfig | WorkerConfigDirect;
    private verbose = false;

    private worker?: Worker;
    private executing = false;
    private executionCounter = 0;
    private awaitAnswers = new Map<string, AwaitHandler[]>();

    constructor(config: WorkerTaskConfig) {
        this.taskName = config.taskName;
        this.workerId = config.workerId;
        this.workerConfig = config.workerConfig;
        this.verbose = config.verbose === true;
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

    createWorker() {
        if (this.worker) {
            throw new Error('Worker already created. Aborting...');
        }
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

        if (!this.worker) {
            throw new Error('No valid worker configuration was supplied. Aborting...');
        }

        this.worker.onmessage = (async (answer) => {
            // only process WorkerTaskMessage
            const wtm = answer.data as WorkerTaskMessage;
            if (wtm.cmd) {
                const awaitHandlers = this.awaitAnswers.get(wtm.uuid ?? 'unknown');
                awaitHandlers?.forEach(handler => {
                    if (handler.name === wtm.cmd) {
                        if (handler.log === true) {
                            const completionMsg = `Received: ${wtm.cmd} (workerName: ${wtm.name ?? 'unknown'}) with uuid: ${wtm.uuid}`;
                            console.log(completionMsg);
                        }
                        for (const resolve of handler.resolve) {
                            resolve(wtm);
                        }
                        if (handler.endExecution === true) {
                            this.markExecuting(false);
                        }
                        if (handler.remove === true) {
                            this.awaitAnswers.delete(wtm.uuid!);
                        }
                    }
                });
            } else {
                console.error(`Received: unknown message: ${wtm}`);
            }
        });
        this.worker.onerror = (async (answer) => {
            console.log(`Execution Aborted: ${answer.error}`);
            Promise.reject(answer);
            this.markExecuting(false);
        });
    }

    async initWorker(def: WorkerMessageDef): Promise<WorkerTaskMessage> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('No worker is available. Aborting...'));
                this.markExecuting(false);
            } else {
                if (this.verbose) {
                    console.log(`Task: ${this.taskName}: Waiting for completion of worker init.`);
                }

                const message = def.message;
                message.cmd = WorkerTaskCommandRequest.INIT;
                const transferablesToWorker = this.handleTransferables(def);

                this.updateAwaitHandlers(message, [{
                    name: WorkerTaskCommandResponse.INIT_COMPLETE,
                    resolve: [resolve],
                    reject: reject,
                    remove: true,
                    log: this.verbose,
                }]);
                this.worker?.postMessage(message, transferablesToWorker);
            }
        });
    }

    async executeWorker(def: WorkerExecutionDef): Promise<WorkerTaskMessage> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('No worker is available. Aborting...'));
                this.markExecuting(false);
            } else {
                this.markExecuting(true);

                const message = def.message;
                message.cmd = WorkerTaskCommandRequest.EXECUTE;
                const transferablesToWorker = this.handleTransferables(def);

                const awaitHandlers: AwaitHandler[] = [];
                const resolveFuncs: Array<(message: WorkerTaskMessage) => void> = [];
                if (def.onComplete) {
                    resolveFuncs.push(def.onComplete);
                }
                resolveFuncs.push(resolve);
                awaitHandlers.push({
                    name: WorkerTaskCommandResponse.EXECUTE_COMPLETE,
                    resolve: resolveFuncs,
                    reject: reject,
                    remove: true,
                    endExecution: true,
                    log: this.verbose
                });

                if (typeof def.onIntermediateConfirm === 'function') {
                    awaitHandlers.push({
                        name: WorkerTaskCommandResponse.INTERMEDIATE_CONFIRM,
                        resolve: [def.onIntermediateConfirm],
                        reject: reject,
                        remove: false,
                        log: this.verbose
                    });
                }
                this.updateAwaitHandlers(message, awaitHandlers);
                this.worker.postMessage(message, transferablesToWorker);
            }
        });
    }

    /**
     * This is only possible if the worker is available.
     */
    sentMessage(def: WorkerIntermediateMessageDef): Promise<WorkerTaskMessage> {
        return new Promise((resolve, reject) => {
            if (this.checkWorker(reject)) {
                const message = def.message;

                if (message.cmd === 'unknown' || message.cmd.length === 0) {
                    throw new Error('No command provided. Aborting...');
                }
                const transferablesToWorker = this.handleTransferables(def);

                if (def.awaitAnswer === true) {
                    if (!def.answer) {
                        reject(new Error('No answer name provided. Aborting...'));
                        return;
                    }
                    this.updateAwaitHandlers(message, [{
                        name: def.answer,
                        resolve: [resolve],
                        reject: reject,
                        remove: true,
                        log: this.verbose
                    }]);
                }
                this.worker?.postMessage(message, transferablesToWorker);

                if (!def.awaitAnswer) {
                    resolve(WorkerTaskMessage.createEmpty());
                }
            }
        });
    }

    private updateAwaitHandlers(wtm: WorkerTaskMessage, awaitHandlers: AwaitHandler[]) {
        wtm.workerId = this.workerId;
        wtm.uuid = this.buildUuid();
        this.awaitAnswers.set(wtm.uuid, awaitHandlers);
    }

    private buildUuid() {
        return `${this.workerId}_${this.executionCounter++}_${Math.floor(Math.random() * 100000000)}`;
    }

    private handleTransferables(def: WorkerMessageDef) {
        let transferablesToWorker: Transferable[] = [];
        if (def.transferables) {
            // copy transferables if wanted
            if (def.copyTransferables === true) {
                for (const transferable of def.transferables) {
                    transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                }
            } else {
                transferablesToWorker = def.transferables;
            }
        }
        return transferablesToWorker;
    }

    private checkWorker(reject: (error: Error) => void) {
        if (!this.worker) {
            reject(new Error('No worker is available. Aborting...'));
            this.markExecuting(false);
            return false;
        }
        return true;
    }

    dispose() {
        this.worker?.terminate();
    }

    printAwaitAnswers() {
        console.log(`${this.taskName}: awaitAnswers:`);
        console.log(this.awaitAnswers);
    }

}

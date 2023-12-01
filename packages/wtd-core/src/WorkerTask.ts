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

export type WorkerIntermediateMessageDef = WorkerMessageDef & {
    answer?: string;
    awaitAnswer?: boolean;
}

export type WorkerExecutionDef = {
    message: WorkerTaskMessage;
    onComplete?: (message: WorkerTaskMessageConfig) => void;
    onIntermediateConfirm?: (message: WorkerTaskMessageConfig) => void;
    transferables?: Transferable[];
    copyTransferables?: boolean;
}

export type WorkerTaskConfig = {
    taskName: string;
    workerId: number;
    workerConfig: WorkerConfig | WorkerConfigDirect;
    piggyBag?: boolean;
    verbose?: boolean;
}

type AwaitHandler = {
    name: string;
    resolve: Array<(wtm: WorkerTaskMessageConfig) => void>;
    reject: (error: Error) => void;
    remove: boolean;
    log: boolean;
    endExecution?: boolean;
}

export class WorkerTask {

    private taskName: string;
    private workerId: number;
    private workerConfig: WorkerConfig | WorkerConfigDirect;
    private piggyBag = false;
    private verbose = false;

    private worker?: Worker;
    private executing = false;
    private executionCounter = 0;
    private awaitAnswers = new Map<number, AwaitHandler[]>();

    constructor(config: WorkerTaskConfig) {
        this.taskName = config.taskName;
        this.workerId = config.workerId;
        this.workerConfig = config.workerConfig;
        this.verbose = config.verbose === true;
        this.piggyBag = config.piggyBag === true;
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

        const delegate = (this.piggyBag === true) ? extractDelegate(this.worker) : undefined;
        this.worker.onmessage = (async (answer) => {
            // only process WorkerTaskMessage
            const wtm = answer.data as WorkerTaskMessageConfig;
            if (wtm.cmd) {
                const awaitHandlers = this.awaitAnswers.get(wtm.id ?? -1);
                awaitHandlers?.forEach(handler => {
                    if (handler.name === wtm.cmd) {
                        if (handler.log === true) {
                            const completionMsg = `Received: ${wtm.cmd} (workerId: ${wtm.workerId ?? -1}) with id: ${wtm.id ?? -1}`;
                            console.log(completionMsg);
                        }
                        for (const resolve of handler.resolve) {
                            resolve(wtm);
                        }
                        if (handler.endExecution === true) {
                            this.markExecuting(false);
                        }
                        if (handler.remove === true) {
                            this.awaitAnswers.delete(wtm.id!);
                        }
                    }
                });
            } else {
                delegate?.(answer);
            }
        });
        this.worker.onerror = (async (answer) => {
            console.log(`Execution Aborted: ${answer.error}`);
            Promise.reject(answer);
            this.markExecuting(false);
        });
    }

    async initWorker(def: WorkerInitMessageDef): Promise<WorkerTaskMessageConfig> {
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
                message.workerId = this.workerId;
                message.id = this.executionCounter++;
                const transferablesToWorker = this.handleTransferables(def);

                this.awaitAnswers.set(message.id, [{
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

    async executeWorker(def: WorkerExecutionDef): Promise<WorkerTaskMessageConfig> {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('No worker is available. Aborting...'));
                this.markExecuting(false);
            } else {
                this.markExecuting(true);
                const message = def.message;
                message.cmd = WorkerTaskCommandRequest.EXECUTE;
                message.workerId = this.workerId;
                message.id = this.executionCounter++;
                const transferablesToWorker = this.handleTransferables(def);

                const awaitHandlers: AwaitHandler[] = [];
                const resolveFuncs: Array<(message: WorkerTaskMessageConfig) => void> = [];
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
                this.awaitAnswers.set(message.id, awaitHandlers);
                this.worker.postMessage(message, transferablesToWorker);
            }
        });
    }

    /**
     * This is only possible if the worker is available.
     */
    sentMessage(def: WorkerIntermediateMessageDef): Promise<WorkerTaskMessageConfig> {
        return new Promise((resolve, reject) => {
            if (this.checkWorker(reject)) {
                const message = def.message;

                message.workerId = this.workerId;
                message.id = this.executionCounter++;
                const transferablesToWorker = this.handleTransferables(def);

                if (def.awaitAnswer === true) {
                    if (!def.answer) {
                        reject(new Error('No answer name provided. Aborting...'));
                        return;
                    }
                    this.awaitAnswers.set(message.id, [{
                        name: def.answer,
                        resolve: [resolve],
                        reject: reject,
                        remove: true,
                        log: this.verbose
                    }]);
                }
                this.worker?.postMessage(message, transferablesToWorker);
            }
        });
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

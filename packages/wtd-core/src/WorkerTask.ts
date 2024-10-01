import { WorkerMessage } from './WorkerMessage.js';
import { WorkerTaskCommandRequest, WorkerTaskCommandResponse } from './WorkerTaskWorker.js';
import { AwaitHandler, ComChannelEndpoint, ComChannelEndpointConfig, WorkerMessageDef } from './ComChannelEndpoint.js';

export interface WorkerExecutionDef {
    message: WorkerMessage;
    onComplete?: (message: WorkerMessage) => void;
    onIntermediateConfirm?: (message: WorkerMessage) => void;
    transferables?: Transferable[];
    copyTransferables?: boolean;
}

export class WorkerTask extends ComChannelEndpoint {

    private executing = false;

    constructor(config: ComChannelEndpointConfig) {
        super(config);
    }

    isWorkerExecuting() {
        return this.executing;
    }

    markExecuting(executing: boolean) {
        this.executing = executing;
    }

    connect() {
        super.connect();

        if (this.impl !== undefined && Object.hasOwn(this.impl ?? {}, 'onerror')) {
            (this.impl as Worker).onerror = (async (answer) => {
                console.log(`Execution Aborted: ${answer.error}`);
                Promise.reject(answer);
                this.markExecuting(false);
            });
        }
    }

    async initWorker(def: WorkerMessageDef): Promise<WorkerMessage> {
        return new Promise((resolve, reject) => {
            if (!this.impl) {
                reject(new Error('No worker is available. Aborting...'));
                this.markExecuting(false);
            } else {
                if (this.verbose) {
                    console.log(`Task: ${this.endpointName}: Waiting for completion of worker init.`);
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
                this.impl.postMessage(message, transferablesToWorker);
            }
        });
    }

    async executeWorker(def: WorkerExecutionDef): Promise<WorkerMessage> {
        return new Promise((resolve, reject) => {
            if (!this.impl) {
                reject(new Error('No worker is available. Aborting...'));
                this.markExecuting(false);
            } else {
                this.markExecuting(true);

                const message = def.message;
                message.cmd = WorkerTaskCommandRequest.EXECUTE;
                const transferablesToWorker = this.handleTransferables(def);

                const awaitHandlers: AwaitHandler[] = [];
                const resolveFuncs: Array<(message: WorkerMessage) => void> = [];
                if (def.onComplete) {
                    resolveFuncs.push(def.onComplete);
                }
                resolveFuncs.push(resolve);
                awaitHandlers.push({
                    name: WorkerTaskCommandResponse.EXECUTE_COMPLETE,
                    resolve: resolveFuncs,
                    reject: reject,
                    remove: true,
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
                this.impl.postMessage(message, transferablesToWorker);
            }
        });
    }

    override removeAwaitHandler(handler: AwaitHandler, wm: WorkerMessage) {
        const removed = super.removeAwaitHandler(handler, wm);
        if (removed) {
            this.markExecuting(false);
        }
        return removed;
    }
}

import { comRouting } from './utilities.js';
import { WorkerMessage } from './WorkerMessage.js';

export interface WorkerConfig {
    $type: 'WorkerConfigParams'
    workerType: 'classic' | 'module';
    blob?: boolean;
    url: URL | string | undefined;
}

export interface EndpointConfigDirect {
    $type: 'DirectImplConfig';
    impl: Worker | MessagePort | DedicatedWorkerGlobalScope;
}

export interface AwaitHandler {
    name: string;
    resolve: Array<(wm: WorkerMessage) => void>;
    reject: (error: Error) => void;
    remove: boolean;
    log: boolean;
}

export interface WorkerMessageDef {
    message: WorkerMessage;
    transferables?: Transferable[];
    copyTransferables?: boolean;
    expectedAnswer?: string;
    awaitAnswer?: boolean;
}

export interface ComChannelEndpointConfig {
    endpointId: number;
    endpointConfig: WorkerConfig | EndpointConfigDirect;
    verbose?: boolean;
    endpointName: string;
}

export interface ComRouter {
    setComChannelEndpoint(comChannelEndpoint: ComChannelEndpoint): void;
}

export class ComChannelEndpoint {

    protected endpointId: number;
    protected endpointName: string;
    protected endpointConfig: WorkerConfig | EndpointConfigDirect;
    protected verbose = false;

    protected impl?: Worker | MessagePort | DedicatedWorkerGlobalScope;
    protected executionCounter = 0;
    protected awaitAnswers = new Map<string, AwaitHandler[]>();

    constructor(config: ComChannelEndpointConfig) {
        this.endpointId = config.endpointId;
        this.endpointConfig = config.endpointConfig;
        this.verbose = config.verbose === true;
        this.endpointName = config.endpointName;
    }

    getImpl() {
        return this.impl;
    }

    connect(comRoutingHandler?: ComRouter) {
        if (this.impl) {
            throw new Error('Worker already created. Aborting...');
        }
        if (this.endpointConfig.$type === 'DirectImplConfig') {
            this.impl = this.endpointConfig.impl;
        } else {
            if (this.endpointConfig.url !== undefined) {
                if (this.endpointConfig.blob === true) {
                    this.impl = new Worker(this.endpointConfig.url);
                }
                else {
                    this.impl = new Worker((this.endpointConfig.url as URL).href, {
                        type: this.endpointConfig.workerType
                    });
                }
            }
        }

        if (!this.impl) {
            throw new Error('No valid worker configuration was supplied. Aborting...');
        }

        this.impl.onmessage = (async (message) => {
            if (comRoutingHandler !== undefined) {
                comRoutingHandler.setComChannelEndpoint(this);
                comRouting(comRoutingHandler, message);
            }
            this.processAwaitHandlerRemoval(message);
        });
        this.impl.onmessageerror = (async (msg) => {
            console.log(`Received errornuous message: ${msg}`);
            Promise.reject(msg);
        });

        if (Object.hasOwn(this.impl ?? {}, 'onerror')) {
            (this.impl as Worker).onerror = (async (message) => {
                console.log(`Execution Aborted: ${message.error}`);
                Promise.reject(message);
            });
        }
    }

    /**
     * This is only possible if the worker is available.
     */
    sentMessage(def: WorkerMessageDef): Promise<WorkerMessage> {
        if (this.impl === undefined) {
            return Promise.reject(new Error('No worker is available. Aborting...'));
        }

        return new Promise((resolve, reject) => {
            if (this.checkWorker(reject)) {
                const message = def.message;

                if (message.cmd === 'unknown' || message.cmd.length === 0) {
                    throw new Error('No command provided. Aborting...');
                }
                const transferablesToWorker = this.handleTransferables(def);

                if (def.awaitAnswer === true) {
                    if (def.expectedAnswer === undefined) {
                        reject(new Error('No answer name provided. Aborting...'));
                        return;
                    }
                    this.updateAwaitHandlers(message, [{
                        name: def.expectedAnswer,
                        resolve: [resolve],
                        reject: reject,
                        remove: true,
                        log: this.verbose
                    }]);
                }
                this.impl?.postMessage(message, transferablesToWorker);

                if (def.awaitAnswer === false) {
                    resolve(WorkerMessage.createEmpty());
                }
            }
        });
    }

    sentAnswer(def: WorkerMessageDef): Promise<WorkerMessage> {
        def.message.answer = true;
        return this.sentMessage(def);
    }

    protected updateAwaitHandlers(wm: WorkerMessage, awaitHandlers: AwaitHandler[]) {
        wm.endpointdId = this.endpointId;
        wm.uuid = this.buildUuid();
        this.awaitAnswers.set(wm.uuid, awaitHandlers);
    }

    protected buildUuid() {
        return `${this.endpointId}_${this.executionCounter++}_${Math.floor(Math.random() * 100000000)}`;
    }

    protected handleTransferables(def: WorkerMessageDef) {
        let transferablesToWorker: Transferable[] = [];
        if (def.transferables !== undefined) {
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

    processAwaitHandlerRemoval(message: MessageEvent): Promise<void> | void {
        const data = (message as MessageEvent).data;
        // only process WorkerMessage
        if (Object.hasOwn(data, 'cmd')) {
            const wm = message.data as WorkerMessage;
            const awaitHandlers = this.awaitAnswers.get(wm.uuid);
            awaitHandlers?.forEach(handler => this.removeAwaitHandler(handler, wm));
        } else {
            console.error(`Received: unknown message: ${message}`);
        }
    }

    /**
     *
     * @param handler
     * @param wm
     * @returns returns if the handler was removed
     */
    protected removeAwaitHandler(handler: AwaitHandler, wm: WorkerMessage): boolean {
        if (handler.name === wm.cmd) {
            if (handler.log === true) {
                const completionMsg = `${this.endpointName}: Received: ${wm.cmd} (workerName: ${wm.name}) with uuid: ${wm.uuid}`;
                console.log(completionMsg);
            }
            for (const resolve of handler.resolve) {
                resolve(wm);
            }
            if (handler.remove === true) {
                this.awaitAnswers.delete(wm.uuid);
            }
            return true;
        }
        return false;
    }

    protected checkWorker(reject: (error: Error) => void) {
        if (!this.impl) {
            reject(new Error('No worker is available. Aborting...'));
            return false;
        }
        return true;
    }

    dispose() {
        if (this.impl !== undefined) {
            if (Object.hasOwn(this.impl, 'terminate')) {
                (this.impl as Worker).terminate();
            } else if (Object.hasOwn(this.impl, 'start')) {
                (this.impl as MessagePort).close();
            } else {
                (this.impl as DedicatedWorkerGlobalScope).close();
            }
        }
    }

    printAwaitAnswers() {
        console.log('awaitAnswers:');
        console.log(this.awaitAnswers);
    }

}

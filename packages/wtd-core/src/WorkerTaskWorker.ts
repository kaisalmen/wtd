import { Payload } from './Payload.js';
import { RawPayload } from './RawPayload.js';
import { WorkerMessage } from './WorkerMessage.js';

export enum WorkerTaskCommandRequest {
    INIT = 'init',
    INIT_CHANNEL = 'initChannel',
    INTERMEDIATE = 'intermediate',
    EXECUTE = 'execute',
    INTERCOM_INIT = 'interComInit',
    INTERCOM_INTERMEDIATE = 'interComIntermediate',
    INTERCOM_EXECUTE = 'interComExecute',
}

export enum WorkerTaskCommandResponse {
    INIT_COMPLETE = 'initComplete',
    INIT_CHANNEL_COMPLETE = 'initChannelComplete',
    INTERMEDIATE_CONFIRM = 'intermediateConfirm',
    EXECUTE_COMPLETE = 'executeComplete',
    INTERCOM_INIT_COMPLETE = 'interComInitComplete',
    INTERCOM_INTERMEDIATE_CONFIRM = 'interComIntermediateConfirm',
    INTERCOM_EXECUTE_COMPLETE = 'interComExecuteComplete'
}

export interface WorkerTaskWorker {
    init?(message: WorkerMessage): void;
    initChannel?(message: WorkerMessage): void;
    intermediate?(message: WorkerMessage): void;
    execute?(message: WorkerMessage): void;
}

export interface InterComWorker {
    interComInit?(message: WorkerMessage): void;
    interComInitComplete?(message: WorkerMessage): void;
    interComIntermediate?(message: WorkerMessage): void;
    interComIntermediateConfirm?(message: WorkerMessage): void;
    interComExecute?(message: WorkerMessage): void;
    interComExecuteComplete?(message: WorkerMessage): void;
}

export class InterComPortHandler {

    private ports: Map<string, MessagePort> = new Map();

    registerPort(name: string, payload: Payload | undefined, onmessage: (message: MessageEvent<unknown>) => void) {
        const port = payload ? (payload as RawPayload).message.raw.port as MessagePort : undefined;
        if (!port) {
            throw new Error(`${payload?.message ?? 'undefined'} is not a RawPayload. Unable to extract a port.`);
        }
        this.ports.set(name, port);
        port.onmessage = onmessage;
    }

    postMessageOnPort(target: string, message: WorkerMessage, options?: StructuredSerializeOptions) {
        this.ports.get(target)?.postMessage(message, options);
    }
}

import { Payload } from './Payload.js';
import { RawPayload } from './RawPayload.js';
import { WorkerTaskMessage } from './WorkerTaskMessage.js';

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

export type WorkerTaskWorker = {
    init?(message: WorkerTaskMessage): void;
    initChannel?(message: WorkerTaskMessage): void;
    intermediate?(message: WorkerTaskMessage): void;
    execute(message: WorkerTaskMessage): void;
}

export type InterComWorker = {
    interComInit?(message: WorkerTaskMessage): void;
    interComInitComplete?(message: WorkerTaskMessage): void;
    interComIntermediate?(message: WorkerTaskMessage): void;
    interComIntermediateConfirm?(message: WorkerTaskMessage): void;
    interComExecute?(message: WorkerTaskMessage): void;
    interComExecuteComplete?(message: WorkerTaskMessage): void;
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

    postMessageOnPort(target: string, message: WorkerTaskMessage, options?: StructuredSerializeOptions) {
        this.ports.get(target)?.postMessage(message, options);
    }
}

export const comRouting = (workerImpl: WorkerTaskWorker | InterComWorker, message: MessageEvent<unknown>) => {
    const wtm = (message as MessageEvent).data as WorkerTaskMessage;
    if (wtm && wtm.cmd) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = (workerImpl as any);
        const funcName = wtm.cmd ?? 'unknown';
        if (typeof obj[funcName] === 'function') {
            obj[funcName](wtm);
        } else {
            console.warn(`No function "${funcName}" found on workerImpl.`);
        }
    } else {
        console.error(`Received: unknown message: ${wtm}`);
    }
};

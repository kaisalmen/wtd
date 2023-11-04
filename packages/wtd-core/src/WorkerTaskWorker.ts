import { Payload } from './Payload.js';
import { RawPayload } from './RawPayload.js';
import { WorkerTaskMessageType } from './WorkerTaskMessage.js';

export type WorkerTaskWorker = {

    init?(message: WorkerTaskMessageType): void;

    intermediate?(message: WorkerTaskMessageType): void;

    execute(message: WorkerTaskMessageType): void;
}

export type InterComWorker = {

    interComInit?(message: WorkerTaskMessageType): void;

    interComInitComplete?(message: WorkerTaskMessageType): void;

    interComIntermediate?(message: WorkerTaskMessageType): void;

    interComIntermediateConfirm?(message: WorkerTaskMessageType): void;

    interComExecute?(message: WorkerTaskMessageType): void;

    interComExecuteComplete?(message: WorkerTaskMessageType): void;
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

    postMessageOnPort(target: string, message: WorkerTaskMessageType, options?: StructuredSerializeOptions) {
        this.ports.get(target)?.postMessage(message, options);
    }
}

export const comRouting = (workerImpl: WorkerTaskWorker | InterComWorker, message: MessageEvent<unknown>) => {
    const wtmt = (message as MessageEvent).data as WorkerTaskMessageType;
    if (wtmt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = (workerImpl as any);
        const funcName = wtmt.cmd;
        if (typeof obj[funcName] === 'function') {
            obj[funcName](wtmt);
        }
    }
};

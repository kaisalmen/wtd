import { Payload } from './Payload.js';
import { RawPayload } from './RawPayload.js';
import { WorkerTaskCommandRequest, WorkerTaskCommandResponse, WorkerTaskMessageType } from './WorkerTaskMessage.js';

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

export const printDefaultMessage = (funcName: string, message: WorkerTaskMessageType) => {
    console.log(`WorkerTaskDefaultWorker#${funcName}: name: ${message.name} id: ${message.id} workerId: ${message.workerId}`);
};

export const comRouting = (workerImpl: WorkerTaskWorker | InterComWorker, message: MessageEvent<unknown>) => {
    const wtmt = (message as MessageEvent).data as WorkerTaskMessageType;
    if (wtmt) {
        const wtw = workerImpl as WorkerTaskWorker;
        const icw = workerImpl as InterComWorker;
        switch (wtmt.cmd) {
            case WorkerTaskCommandRequest.INIT:
                wtw.init?.(wtmt);
                break;
            case WorkerTaskCommandRequest.INTERMEDIATE:
                wtw.intermediate?.(wtmt);
                break;
            case WorkerTaskCommandRequest.EXECUTE:
                wtw.execute?.(wtmt);
                break;
            case WorkerTaskCommandRequest.INTERCOM_INIT:
                icw.interComInit?.(wtmt);
                break;
            case WorkerTaskCommandResponse.INTERCOM_INIT_COMPLETE:
                icw.interComInitComplete?.(wtmt);
                break;
            case WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE:
                icw.interComIntermediate?.(wtmt);
                break;
            case WorkerTaskCommandResponse.INTERCOM_INTERMEDIATE_CONFIRM:
                icw.interComIntermediateConfirm?.(wtmt);
                break;
            case WorkerTaskCommandRequest.INTERCOM_EXECUTE:
                icw.interComExecute?.(wtmt);
                break;
            case WorkerTaskCommandResponse.INTERCOM_EXECUTE_COMPLETE:
                icw.interComExecuteComplete?.(wtmt);
                break;
            default:
                break;
        }
    }
};

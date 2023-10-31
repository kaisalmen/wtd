import { Payload } from './Payload.js';
import { RawPayload } from './RawPayload.js';
import { WorkerTaskCommandRequest, WorkerTaskMessageType } from './WorkerTaskMessage.js';

declare const self: DedicatedWorkerGlobalScope;

export type WorkerTaskWorker = {

    init(message: WorkerTaskMessageType): void;

    intermediate(message: WorkerTaskMessageType): void;

    execute(message: WorkerTaskMessageType): void;

    comRouting(message: never): void;
}

export type InterComWorker = WorkerTaskWorker & {

    interComInit(message: WorkerTaskMessageType): void;

    interComIntermediate(message: WorkerTaskMessageType): void;

    interComExecute(message: WorkerTaskMessageType): void;
}

export class WorkerTaskDefaultWorker implements InterComWorker {

    private ports: Map<string, MessagePort> = new Map();

    init(message: WorkerTaskMessageType): void {
        this.printDefaultMessage(WorkerTaskCommandRequest.INIT, message);
    }

    intermediate(message: WorkerTaskMessageType): void {
        this.printDefaultMessage(WorkerTaskCommandRequest.INTERMEDIATE, message);
    }

    execute(message: WorkerTaskMessageType): void {
        this.printDefaultMessage(WorkerTaskCommandRequest.EXECUTE, message);
    }

    interComInit(message: WorkerTaskMessageType): void {
        this.printDefaultMessage(WorkerTaskCommandRequest.INTERCOM_INIT, message);
    }

    interComIntermediate(message: WorkerTaskMessageType): void {
        this.printDefaultMessage(WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE, message);
    }

    interComExecute(message: WorkerTaskMessageType): void {
        this.printDefaultMessage(WorkerTaskCommandRequest.INTERCOM_EXECUTE, message);
    }

    private printDefaultMessage(funcName: string, message: WorkerTaskMessageType): void {
        console.log(`WorkerTaskDefaultWorker#${funcName}: name: ${message.name} id: ${message.id} workerId: ${message.workerId}`);
    }

    comRouting(message: MessageEvent<unknown>) {
        const wtmt = (message as MessageEvent).data as WorkerTaskMessageType;
        if (wtmt) {
            switch (wtmt.cmd) {
                case WorkerTaskCommandRequest.INIT:
                    this.init(wtmt);
                    break;
                case WorkerTaskCommandRequest.INTERMEDIATE:
                    this.intermediate(wtmt);
                    break;
                case WorkerTaskCommandRequest.EXECUTE:
                    this.execute(wtmt);
                    break;
                case WorkerTaskCommandRequest.INTERCOM_INIT:
                    this.interComInit(wtmt);
                    break;
                case WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE:
                    this.interComIntermediate(wtmt);
                    break;
                case WorkerTaskCommandRequest.INTERCOM_EXECUTE:
                    this.interComExecute(wtmt);
                    break;
            }
        }
    }

    postMessage(message: WorkerTaskMessageType, options?: StructuredSerializeOptions) {
        self.postMessage(message, options);
    }

    registerPort(name: string, payload: Payload | undefined) {
        const port = payload ? (payload as RawPayload).message.raw.port as MessagePort : undefined;
        if (!port) {
            throw new Error(`${payload?.message ?? 'undefined'} is not a RawPayload. Unable to extract a port.`);
        }
        this.ports.set(name, port);
        port.onmessage = (message: MessageEvent<unknown>) => {
            this.comRouting(message);
        };
    }

    postMessageOnPort(target: string, message: WorkerTaskMessageType, options?: StructuredSerializeOptions) {
        this.ports.get(target)?.postMessage(message, options);
    }
}

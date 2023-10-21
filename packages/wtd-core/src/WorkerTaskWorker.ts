import { WorkerTaskMessageType } from './WorkerTaskMessage.js';

export type WorkerTaskWorker = {

    init(message: WorkerTaskMessageType): void;

    execute(message: WorkerTaskMessageType): void;

    intermediate(message: WorkerTaskMessageType): void;

    comRouting(message: never): void;

}

export class WorkerTaskDefaultWorker implements WorkerTaskWorker {

    init(message: WorkerTaskMessageType): void {
        console.log(`WorkerTaskDefaultWorker#init: name: ${message.name} id: ${message.id} workerId: ${message.workerId}`);
    }

    intermediate(message: WorkerTaskMessageType): void {
        console.log(`WorkerTaskDefaultWorker#intermediateMessage: name: ${message.name} id: ${message.id} workerId: ${message.workerId}`);
    }

    execute(message: WorkerTaskMessageType): void {
        console.log(`WorkerTaskDefaultWorker#execute: name: ${message.name} id: ${message.id} workerId: ${message.workerId}`);
    }

    comRouting(message: MessageEvent<unknown>) {
        const wtmt = (message as MessageEvent).data as WorkerTaskMessageType;
        if (wtmt) {
            if (wtmt.cmd === 'init') {
                this.init(wtmt);
            }
            else if (wtmt.cmd === 'intermediate') {
                this.intermediate(wtmt);
            }
            else if (wtmt.cmd === 'execute') {
                this.execute(wtmt);
            }
        }
    }
}

import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    WorkerTaskMessage,
    DataPayload
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest1 extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest1#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = WorkerTaskMessage.createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest1#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);

        const dataPayload = new DataPayload();
        dataPayload.params = {
            data: new Uint32Array(32 * 1024 * 1024)
        };

        const execComplete = WorkerTaskMessage.createFromExisting(wtm, 'execComplete');
        execComplete.addPayload(dataPayload);

        const transferables = execComplete.pack(false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new TransferableWorkerTest1();
self.onmessage = message => worker.comRouting(message);

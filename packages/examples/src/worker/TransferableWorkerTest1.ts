import {
    WorkerTaskDirectorWorker,
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskMessageType,
    WorkerTaskMessage,
    DataPayload
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest1 extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest1#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        message.cmd = 'initComplete';
        self.postMessage(message);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest1#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);

        const dataPayload = new DataPayload();
        dataPayload.params = {
            data: new Uint32Array(32 * 1024 * 1024)
        };

        wtm.cleanPayloads();
        wtm.addPayload(dataPayload);

        wtm.cmd = 'execComplete';
        const transferables = wtm.pack(false);
        self.postMessage(wtm, transferables);
    }

}

const worker = new TransferableWorkerTest1();
self.onmessage = message => worker.comRouting(message);

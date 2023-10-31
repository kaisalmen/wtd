import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    DataPayload,
    createFromExisting,
    pack,
    unpack,
    WorkerTaskCommandResponse
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest1 extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest1#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest1#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = unpack(message, false);

        const dataPayload = new DataPayload();
        dataPayload.message.params = {
            data: new Uint32Array(32 * 1024 * 1024)
        };

        const execComplete = createFromExisting(wtm, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        execComplete.addPayload(dataPayload);

        const transferables = pack(execComplete.payloads, false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new TransferableWorkerTest1();
self.onmessage = message => worker.comRouting(message);

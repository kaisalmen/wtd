import {
    comRouting,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskMessageType,
    WorkerTaskWorker
} from 'wtd-core';

class TransferableWorkerTest2 implements WorkerTaskWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);
        if (wtm.payloads.length === 1) {
            const payload = wtm.payloads[0] as DataPayload;
            if (payload.message.params) {
                const payloadOut = new DataPayload();
                payloadOut.message.buffers?.set('data', new Uint32Array(32 * 1024 * 1024));

                const execComplete = WorkerTaskMessage.createFromExisting(wtm, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
                execComplete.name = payload.message.params.name as string;
                execComplete.addPayload(payloadOut);

                const transferables = WorkerTaskMessage.pack(execComplete.payloads, false);
                self.postMessage(execComplete, transferables);
            }
        }
    }
}

const worker = new TransferableWorkerTest2();
self.onmessage = message => comRouting(worker, message);

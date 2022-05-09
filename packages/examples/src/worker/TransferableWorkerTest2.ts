import {
    WorkerTaskDirectorWorker,
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskMessageType,
    WorkerTaskMessage,
    DataPayload
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest2 extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        message.cmd = 'initComplete';
        self.postMessage(message);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);
        if (wtm.payloads.length === 1) {
            const payload = wtm.payloads[0];
            if (payload.params) {
                wtm.name = payload.params.name as string;

                const payloadOut = new DataPayload();
                payloadOut.buffers.set('data', new Uint32Array(32 * 1024 * 1024));

                wtm.cleanPayloads();
                wtm.addPayload(payloadOut);

                wtm.cmd = 'execComplete';
                const transferables = wtm.pack(false);
                self.postMessage(wtm, transferables);
            }
        }
    }
}

const worker = new TransferableWorkerTest2();
self.onmessage = message => worker.comRouting(message);

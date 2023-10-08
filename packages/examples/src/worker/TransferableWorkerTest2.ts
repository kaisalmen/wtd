import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    WorkerTaskMessage,
    DataPayload
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest2 extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = WorkerTaskMessage.createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);
        if (wtm.payloads.length === 1) {
            const payload = wtm.payloads[0];
            if (payload.params) {
                const payloadOut = new DataPayload();
                payloadOut.buffers.set('data', new Uint32Array(32 * 1024 * 1024));

                const execComplete = WorkerTaskMessage.createFromExisting(wtm, 'execComplete');
                execComplete.name = payload.params.name as string;
                execComplete.addPayload(payloadOut);

                const transferables = execComplete.pack(false);
                self.postMessage(execComplete, transferables);
            }
        }
    }
}

const worker = new TransferableWorkerTest2();
self.onmessage = message => worker.comRouting(message);

import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    DataPayload,
    createFromExisting,
    unpack,
    pack,
    WorkerTaskCommandResponse
} from 'wtd-core';

class TransferableWorkerTest2 extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        this.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest2#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = unpack(message, false);
        if (wtm.payloads.length === 1) {
            const payload = wtm.payloads[0] as DataPayload;
            if (payload.message.params) {
                const payloadOut = new DataPayload();
                payloadOut.message.buffers?.set('data', new Uint32Array(32 * 1024 * 1024));

                const execComplete = createFromExisting(wtm, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
                execComplete.name = payload.message.params.name as string;
                execComplete.addPayload(payloadOut);

                const transferables = pack(execComplete.payloads, false);
                this.postMessage(execComplete, transferables);
            }
        }
    }
}

const worker = new TransferableWorkerTest2();
self.onmessage = message => worker.comRouting(message);

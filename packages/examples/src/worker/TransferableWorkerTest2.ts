import {
    comRouting,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerMessage,
    WorkerTaskWorker
} from 'wtd-core';

class TransferableWorkerTest2 implements WorkerTaskWorker {

    init(message: WorkerMessage) {
        console.log(`TransferableWorkerTest2#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        const initComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerMessage) {
        console.log(`TransferableWorkerTest2#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        const wm = WorkerMessage.unpack(message, false);
        if (wm.payloads.length === 1) {
            const payload = wm.payloads[0] as DataPayload;
            if (payload.message.params !== undefined) {
                const payloadOut = new DataPayload();
                payloadOut.message.buffers?.set('data', new Uint32Array(32 * 1024 * 1024));

                const execComplete = WorkerMessage.createFromExisting(wm, {
                    overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
                });
                execComplete.name = payload.message.params.name as string;
                execComplete.addPayload(payloadOut);

                const transferables = WorkerMessage.pack(execComplete.payloads, false);
                self.postMessage(execComplete, transferables);
            }
        }
    }
}

const worker = new TransferableWorkerTest2();
self.onmessage = message => comRouting(worker, message);

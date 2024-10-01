import {
    comRouting,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerMessage,
    WorkerTaskWorker
} from 'wtd-core';

class TransferableWorkerTest1 implements WorkerTaskWorker {

    init(message: WorkerMessage) {
        console.log(`TransferableWorkerTest1#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        const initComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerMessage) {
        console.log(`TransferableWorkerTest1#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        const wm = WorkerMessage.unpack(message, false);

        const dataPayload = new DataPayload();
        dataPayload.message.params = {
            data: new Uint32Array(32 * 1024 * 1024)
        };

        const execComplete = WorkerMessage.createFromExisting(wm, {
            overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
        });
        execComplete.addPayload(dataPayload);

        const transferables = WorkerMessage.pack(execComplete.payloads, false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new TransferableWorkerTest1();
self.onmessage = message => comRouting(worker, message);

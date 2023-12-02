import {
    comRouting,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskWorker
} from 'wtd-core';

class TransferableWorkerTest1 implements WorkerTaskWorker {

    init(message: WorkerTaskMessage) {
        console.log(`TransferableWorkerTest1#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = WorkerTaskMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessage) {
        console.log(`TransferableWorkerTest1#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);

        const dataPayload = new DataPayload();
        dataPayload.message.params = {
            data: new Uint32Array(32 * 1024 * 1024)
        };

        const execComplete = WorkerTaskMessage.createFromExisting(wtm, {
            overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
        });
        execComplete.addPayload(dataPayload);

        const transferables = WorkerTaskMessage.pack(execComplete.payloads, false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new TransferableWorkerTest1();
self.onmessage = message => comRouting(worker, message);

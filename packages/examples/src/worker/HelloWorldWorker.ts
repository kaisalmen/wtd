import {
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    createFromExisting
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorldWorker extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        const initComplete = createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(message);
        // burn some time
        for (let i = 0; i < 25000000; i++) {
            i++;
        }

        const dataPayload = new DataPayload();
        dataPayload.message.params = {
            hello: 'say hello'
        };

        const execComplete = createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        execComplete.addPayload(dataPayload);

        // no need to pack as there aren't any buffers used
        self.postMessage(execComplete);
    }

}

const worker = new HelloWorldWorker();
self.onmessage = message => worker.comRouting(message);

import {
    DataPayload,
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    createFromExisting
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorldWorker extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        const initComplete = createFromExisting(message, 'initComplete');
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

        const execComplete = createFromExisting(message, 'execComplete');
        execComplete.addPayload(dataPayload);

        // no need to pack as there aren't any buffers used
        self.postMessage(execComplete);
    }

}

const worker = new HelloWorldWorker();
self.onmessage = message => worker.comRouting(message);

import {
    comRouting,
    RawPayload,
    WorkerTaskCommandResponse,
    WorkerMessage,
    WorkerTaskWorker
} from 'wtd-core';

export class HelloWorldWorker implements WorkerTaskWorker {

    init(message: WorkerMessage) {
        const initComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerMessage) {
        // burn some time
        for (let i = 0; i < 25000000; i++) {
            i++;
        }

        const rawPayload = new RawPayload({
            hello: 'Hello! I just incremented "i" 25 million times.'
        });

        const execComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
        });
        execComplete.addPayload(rawPayload);

        // no need to pack as there aren't any buffers used
        self.postMessage(execComplete);
    }

}

const worker = new HelloWorldWorker();
self.onmessage = message => comRouting(worker, message);

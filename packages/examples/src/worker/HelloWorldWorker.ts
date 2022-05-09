import {
    DataPayload,
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorldWorker extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(message: WorkerTaskMessageType) {
        message.cmd = 'initComplete';
        self.postMessage(message);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(message);
        // burn some time
        for (let i = 0; i < 25000000; i++) {
            i++;
        }

        const dataPayload = new DataPayload();
        dataPayload.params = {
            hello: 'say hello'
        };

        const execCompleteMessage = new WorkerTaskMessage({
            cmd: 'execComplete',
            name: message.name,
            id: message.id,
            workerId: message.workerId
        });
        execCompleteMessage.addPayload(dataPayload);
        // no need to pack as there aren't any buffers used
        self.postMessage(execCompleteMessage);
    }

}

const worker = new HelloWorldWorker();
self.onmessage = message => worker.comRouting(message);

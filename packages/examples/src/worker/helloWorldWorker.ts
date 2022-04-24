import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    PayloadType,
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorldWorker extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(payload: PayloadType) {
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: PayloadType) {
        payload.cmd = 'execComplete';
        payload.params = {
            hello: 'say hello'
        };

        // burn some time
        for (let i = 0; i < 25000000; i++) {
            i++;
        }
        self.postMessage(payload);
    }

}

const worker = new HelloWorldWorker();
self.onmessage = message => worker.comRouting(message);

import {
    RawPayload,
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    createFromExisting
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

export class Com1Worker extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        const initComplete = createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    intermediate(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker2 said: ${rawPayload.message.raw.hello}`);

        const execComplete = createFromExisting(message, 'execComplete');
        const payload = new RawPayload();
        payload.message.raw = { hello: 'Worker 1 finished!' };
        execComplete.addPayload(payload);

        // no need to pack as there aren't any buffers used
        self.postMessage(execComplete);
    }

    execute(message: WorkerTaskMessageType) {
        const port = (message.payloads[0] as RawPayload).message.raw.port as MessagePort;
        port.onmessage = message => worker.comRouting(message);

        const sendWorker2 = createFromExisting(message, 'intermediate');
        const payload = new RawPayload();
        payload.message.raw = { hello: 'Hi Worker 2!' };
        sendWorker2.addPayload(payload);
        port.postMessage(sendWorker2);
    }
}

const worker = new Com1Worker();
self.onmessage = message => worker.comRouting(message);

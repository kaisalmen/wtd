import {
    RawPayload,
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    createFromExisting
} from 'wtd-core';

declare const self: DedicatedWorkerGlobalScope;

export class Com2Worker extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        const initComplete = createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    intermediate(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker1 said: ${rawPayload.message.raw.hello}`);

        const execComplete = createFromExisting(message, 'execComplete');
        const payload = new RawPayload();
        payload.message.raw = { hello: 'Worker 2 finished!' };
        execComplete.addPayload(payload);

        // no need to pack as there aren't any buffers used
        self.postMessage(execComplete);
    }

    execute(message: WorkerTaskMessageType) {
        const port = (message.payloads[0] as RawPayload).message.raw.port as MessagePort;
        port.onmessage = message => worker.comRouting(message);

        const sendWorker1 = createFromExisting(message, 'intermediate');
        const payload = new RawPayload();
        payload.message.raw = { hello: 'Hi Worker 1!' };
        sendWorker1.addPayload(payload);
        port.postMessage(sendWorker1);
    }
}

const worker = new Com2Worker();
self.onmessage = message => worker.comRouting(message);

import {
    RawPayload,
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    createFromExisting
} from 'wtd-core';

export class Com2Worker extends WorkerTaskDefaultWorker {

    interComIntermediate(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker1 said: ${rawPayload.message.raw.hello}`);

        // after receiving the message from Com1Worker, send execComplete to main
        const execComplete = createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        const payload = new RawPayload({ hello: 'Worker 2 finished!' });
        execComplete.addPayload(payload);

        // no need to pack as there aren't any buffers used
        this.postMessage(execComplete);
    }

    execute(message: WorkerTaskMessageType) {
        // register the default com-routing function for inter-worker communication
        this.registerPort('com1', message.payloads[0]);

        // send message with cmd 'interComIntermediate' to Com1Worker
        const sendWorker1 = createFromExisting(message, WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE);
        const payload = new RawPayload({ hello: 'Hi Worker 1!' });
        sendWorker1.addPayload(payload);

        this.postMessageOnPort('com1', sendWorker1);
    }
}

const worker = new Com2Worker();
self.onmessage = message => worker.comRouting(message);

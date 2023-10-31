import {
    RawPayload,
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    createFromExisting
} from 'wtd-core';

export class Com1Worker extends WorkerTaskDefaultWorker {

    interComIntermediate(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker2 said: ${rawPayload.message.raw.hello}`);

        // after receiving the message from Com2Worker, send execComplete to main
        const execComplete = createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        const payload = new RawPayload({ hello: 'Worker 1 finished!' });
        execComplete.addPayload(payload);

        // no need to pack as there aren't any buffers used
        this.postMessage(execComplete);
    }

    execute(message: WorkerTaskMessageType) {
        // register the default com-routing function for inter-worker communication
        this.registerPort('com2', message.payloads[0]);

        // send message with cmd 'interComIntermediate' to Com2Worker
        const sendWorker2 = createFromExisting(message, WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE);
        const payload = new RawPayload({ hello: 'Hi Worker 2!' });
        sendWorker2.addPayload(payload);

        this.postMessageOnPort('com2', sendWorker2);
    }
}

const worker = new Com1Worker();
self.onmessage = message => worker.comRouting(message);

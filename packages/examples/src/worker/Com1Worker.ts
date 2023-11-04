import {
    comRouting,
    InterComPortHandler,
    InterComWorker,
    RawPayload,
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskMessageType,
    WorkerTaskWorker
} from 'wtd-core';

export class Com1Worker implements WorkerTaskWorker, InterComWorker {

    private icph = new InterComPortHandler();

    init(message: WorkerTaskMessageType): void {
        // register the default com-routing function for inter-worker communication
        this.icph.registerPort('com2', message.payloads[0], message => comRouting(this, message));

        // send initComplete to main
        const initComplete = WorkerTaskMessage.createFromExisting({} as WorkerTaskMessageType, WorkerTaskCommandResponse.INIT_COMPLETE);
        const payload = new RawPayload({ hello: 'Worker 1 initComplete!' });
        initComplete.addPayload(payload);

        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        // send message with cmd 'interComIntermediate' to Com2Worker
        const sendWorker2 = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE);
        const payload = new RawPayload({ hello: 'Hi Worker 2!' });
        sendWorker2.addPayload(payload);

        this.icph.postMessageOnPort('com2', sendWorker2);
    }

    interComIntermediate(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker 2 said: ${rawPayload.message.raw.hello}`);

        // after receiving the message from Com2Worker, send interComIntermediateConfirm to worker 2
        const intermediateConfirm = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.INTERCOM_INTERMEDIATE_CONFIRM);
        const payload = new RawPayload({ confirmed: 'Hi Worker 2. I confirm!' });
        intermediateConfirm.addPayload(payload);

        this.icph.postMessageOnPort('com2', intermediateConfirm);
    }

    interComIntermediateConfirm(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker 2 confirmed: ${rawPayload.message.raw.confirmed}`);

        // after receiving the interComIntermediateConfirm from Com2Worker, send execComplete to main
        const execComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        const payload = new RawPayload({ finished: 'Hi Main. Worker 1 completed!' });
        execComplete.addPayload(payload);
        self.postMessage(execComplete);
    }

}

const worker = new Com1Worker();
self.onmessage = message => comRouting(worker, message);

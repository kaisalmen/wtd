import {
    InterComPortHandler,
    InterComWorker,
    RawPayload,
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerTaskMessageType,
    WorkerTaskWorker,
    comRouting,
    createFromExisting
} from 'wtd-core';

export class Com2Worker implements WorkerTaskWorker, InterComWorker {

    private icph = new InterComPortHandler();

    init(message: WorkerTaskMessageType): void {
        // register the default com-routing function for inter-worker communication
        this.icph.registerPort('com1', message.payloads[0], message => comRouting(this, message));

        // send initComplete to main
        const initComplete = createFromExisting({} as WorkerTaskMessageType, WorkerTaskCommandResponse.INIT_COMPLETE);
        const payload = new RawPayload({ hello: 'Worker 2 initComplete!' });
        initComplete.addPayload(payload);

        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        // send message with cmd 'interComIntermediate' to Com1Worker
        const sendWorker1 = createFromExisting(message, WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE);
        const payload = new RawPayload({ hello: 'Hi Worker 1!' });
        sendWorker1.addPayload(payload);

        this.icph.postMessageOnPort('com1', sendWorker1);
    }

    interComIntermediate(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker 1 said: ${rawPayload.message.raw.hello}`);

        // after receiving the message from Com1Worker, send interComIntermediateConfirm to worker 2
        const intermediateConfirm = createFromExisting(message, WorkerTaskCommandResponse.INTERCOM_INTERMEDIATE_CONFIRM);
        const payload = new RawPayload({ confirmed: 'Hi Worker 1. I confirm!' });
        intermediateConfirm.addPayload(payload);

        this.icph.postMessageOnPort('com1', intermediateConfirm);
    }

    interComIntermediateConfirm(message: WorkerTaskMessageType): void {
        const rawPayload = message.payloads[0] as RawPayload;
        console.log(`Worker 1 confirmed: ${rawPayload.message.raw.confirmed}`);

        // after receiving the interComIntermediateConfirm from Com1Worker, send execComplete to main
        const execComplete = createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        const payload = new RawPayload({ finished: 'Hi Main. Worker 2 completed!' });
        execComplete.addPayload(payload);
        self.postMessage(execComplete);
    }

}

const worker = new Com2Worker();
self.onmessage = message => comRouting(worker, message);

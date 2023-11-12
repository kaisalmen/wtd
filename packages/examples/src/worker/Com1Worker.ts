import {
    comRouting,
    InterComPortHandler,
    InterComWorker,
    RawPayload,
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskMessageConfig,
    WorkerTaskWorker
} from 'wtd-core';
import { getOffScreenCanvas, updateText } from './ComWorkerCommon.js';

export class Com1Worker implements WorkerTaskWorker, InterComWorker {

    private icph = new InterComPortHandler();
    private offScreenCanvas?: HTMLCanvasElement;

    init(message: WorkerTaskMessageConfig): void {
        // register the default com-routing function for inter-worker communication
        const payload = message.payloads?.[0];
        this.icph.registerPort('com2', payload, message => comRouting(this, message));
        this.offScreenCanvas = getOffScreenCanvas(payload);
        updateText({
            text: 'Worker 1: init',
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas,
            log: true
        });

        // send initComplete to main
        const initComplete = WorkerTaskMessage.createFromExisting({} as WorkerTaskMessageConfig, WorkerTaskCommandResponse.INIT_COMPLETE);
        const payloadResponse = new RawPayload({ hello: 'Worker 1 initComplete!' });
        initComplete.addPayload(payloadResponse);

        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageConfig) {
        // send message with cmd 'interComIntermediate' to Com2Worker
        const sendWorker2 = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE);
        const payload = new RawPayload({ hello: 'Hi Worker 2!' });
        sendWorker2.addPayload(payload);

        this.icph.postMessageOnPort('com2', sendWorker2);
    }

    interComIntermediate(message: WorkerTaskMessageConfig): void {
        const rawPayload = message.payloads?.[0] as RawPayload;
        const text = `Worker 1: Worker 2 said: ${rawPayload.message.raw.hello}`;
        updateText({
            text,
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas,
            log: true
        });

        setTimeout(() => {
            // after receiving the message from Com2Worker, send interComIntermediateConfirm to worker 2
            const intermediateConfirm = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.INTERCOM_INTERMEDIATE_CONFIRM);
            const payload = new RawPayload({ confirmed: 'Hi Worker 2. I confirm!' });
            intermediateConfirm.addPayload(payload);

            this.icph.postMessageOnPort('com2', intermediateConfirm);
        }, 2000);
    }

    interComIntermediateConfirm(message: WorkerTaskMessageConfig): void {
        const rawPayload = message.payloads?.[0] as RawPayload;
        const text = `Worker 1: Worker 2 confirmed: ${rawPayload.message.raw.confirmed}`;

        updateText({
            text,
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas,
            log: true
        });

        // after receiving the interComIntermediateConfirm from Com2Worker, send execComplete to main
        const execComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        const payload = new RawPayload({ finished: 'Hi Main. Worker 1 completed!' });
        execComplete.addPayload(payload);
        self.postMessage(execComplete);
    }
}

const worker = new Com1Worker();
self.onmessage = message => comRouting(worker, message);

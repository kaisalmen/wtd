import {
    comRouting,
    InterComPortHandler,
    InterComWorker,
    OffscreenWorker,
    RawPayload,
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskMessageConfig,
    WorkerTaskWorker
} from 'wtd-core';
import { getOffScreenCanvas, updateText } from './ComWorkerCommon.js';
import { OffscreenPayload } from 'wtd-core';

export class Com1Worker implements WorkerTaskWorker, InterComWorker, OffscreenWorker {

    private icph = new InterComPortHandler();
    private offScreenCanvas?: HTMLCanvasElement;

    init(message: WorkerTaskMessageConfig): void {
        updateText({
            text: 'Worker 1: init',
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas,
            log: true
        });

        const initComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        initComplete.addPayload(new RawPayload({ hello: 'Com1Worker initComplete!' }));
        self.postMessage(initComplete);
    }

    initChannel(message: WorkerTaskMessageConfig): void {
        // register the default com-routing function for inter-worker communication
        const payloadPort = message.payloads?.[0];
        this.icph.registerPort('com2', payloadPort, message => comRouting(this, message));
    }

    initOffscreenCanvas(message: WorkerTaskMessageConfig): void {
        const payloadOffscreen = message.payloads?.[0] as OffscreenPayload;
        this.offScreenCanvas = getOffScreenCanvas(payloadOffscreen);
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

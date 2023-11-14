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
import { OffscreenPayload } from 'wtd-core';

export class Com2Worker implements WorkerTaskWorker, InterComWorker {

    private icph = new InterComPortHandler();
    private offScreenCanvas?: HTMLCanvasElement;

    init(message: WorkerTaskMessageConfig): void {
        const payloadOffscreen = message.payloads?.[0] as OffscreenPayload;
        this.offScreenCanvas = getOffScreenCanvas(payloadOffscreen);
        updateText({
            text: 'Worker 2: init',
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas,
            log: true
        });

        // register the default com-routing function for inter-worker communication
        const payloadPort = message.payloads?.[1];
        this.icph.registerPort('com1', payloadPort, message => comRouting(this, message));

        // send initComplete to main
        const initComplete = WorkerTaskMessage.createFromExisting({} as WorkerTaskMessageConfig, WorkerTaskCommandResponse.INIT_COMPLETE);
        const payloadResponse = new RawPayload({ hello: 'Worker 2 initComplete!' });
        initComplete.addPayload(payloadResponse);

        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageConfig) {
        // send message with cmd 'interComIntermediate' to Com1Worker
        const sendWorker1 = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE);
        const payload = new RawPayload({ hello: 'Hi Worker 1!' });
        sendWorker1.addPayload(payload);

        this.icph.postMessageOnPort('com1', sendWorker1);
    }

    intermediate(message: WorkerTaskMessageConfig): void {
        const payload = message.payloads?.[0] as RawPayload;
        console.log(payload.message.raw);
    }

    interComIntermediate(message: WorkerTaskMessageConfig): void {
        const rawPayload = message.payloads?.[0] as RawPayload;
        const text = `Worker 2: Worker 1 said: ${rawPayload.message.raw.hello}`;
        updateText({
            text,
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas,
            log: true
        });

        setTimeout(() => {
            // after receiving the message from Com1Worker, send interComIntermediateConfirm to worker 2
            const intermediateConfirm = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.INTERCOM_INTERMEDIATE_CONFIRM);
            const payload = new RawPayload({ confirmed: 'Hi Worker 1. I confirm!' });
            intermediateConfirm.addPayload(payload);

            this.icph.postMessageOnPort('com1', intermediateConfirm);
        }, 2000);
    }

    interComIntermediateConfirm(message: WorkerTaskMessageConfig): void {
        const rawPayload = message.payloads?.[0] as RawPayload;
        const text = `Worker 2: Worker 1 confirmed: ${rawPayload.message.raw.confirmed}`;
        updateText({
            text,
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas,
            log: true
        });

        // after receiving the interComIntermediateConfirm from Com1Worker, send execComplete to main
        const execComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        const payload = new RawPayload({ finished: 'Hi Main. Worker 2 completed!' });
        execComplete.addPayload(payload);
        self.postMessage(execComplete);
    }

}

const worker = new Com2Worker();
self.onmessage = message => comRouting(worker, message);

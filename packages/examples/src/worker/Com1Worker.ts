import {
    comRouting,
    getOffscreenCanvas,
    InterComPortHandler,
    InterComWorker,
    OffscreenWorker,
    OffscreenWorkerCommandResponse,
    RawPayload,
    recalcAspectRatio,
    WorkerTaskCommandRequest,
    WorkerTaskCommandResponse,
    WorkerMessage,
    WorkerTaskWorker
} from 'wtd-core';
import { updateText } from './ComWorkerCommon.js';
import { OffscreenPayload } from 'wtd-core';

export class Com1Worker implements WorkerTaskWorker, InterComWorker, OffscreenWorker {

    private icph = new InterComPortHandler();
    private offScreenCanvas?: OffscreenCanvas;
    private text = 'none';

    initChannel(message: WorkerMessage): void {
        // register the default com-routing function for inter-worker communication
        const payloadPort = message.payloads[0];
        this.icph.registerPort('com2', payloadPort, message => comRouting(this, message));

        const initChannelComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_CHANNEL_COMPLETE
        });
        self.postMessage(initChannelComplete);
    }

    initOffscreenCanvas(message: WorkerMessage): void {
        const offscreenPayload = message.payloads[0] as OffscreenPayload;
        this.offScreenCanvas = getOffscreenCanvas(offscreenPayload);

        const initOffscreenCanvasComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: OffscreenWorkerCommandResponse.INIT_OFFSCREEN_CANVAS_COMPLETE
        });
        self.postMessage(initOffscreenCanvasComplete);
    }

    resize(message: WorkerMessage) {
        const offscreenPayload = message.payloads[0] as OffscreenPayload;
        recalcAspectRatio(this.offScreenCanvas!, offscreenPayload.message.width ?? 0, offscreenPayload.message.height ?? 1);
        this.updateText(false);
    }

    init(message: WorkerMessage): void {
        this.text = 'Worker 1: init';
        this.updateText();

        const initComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        initComplete.addPayload(new RawPayload({ hello: 'Com1Worker initComplete!' }));
        self.postMessage(initComplete);
    }

    execute(message: WorkerMessage) {
        // send message with cmd 'interComIntermediate' to Com2Worker
        const sendWorker2 = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandRequest.INTERCOM_INTERMEDIATE
        });
        const payload = new RawPayload({ hello: 'Hi Worker 2!' });
        sendWorker2.addPayload(payload);

        this.icph.postMessageOnPort('com2', sendWorker2);
    }

    interComIntermediate(message: WorkerMessage): void {
        const rawPayload = message.payloads[0] as RawPayload;
        this.text = `Worker 1: Worker 2 said: ${rawPayload.message.raw.hello}`;
        this.updateText();

        setTimeout(() => {
            // after receiving the message from Com2Worker, send interComIntermediateConfirm to worker 2
            const intermediateConfirm = WorkerMessage.createFromExisting(message, {
                overrideCmd: WorkerTaskCommandResponse.INTERCOM_INTERMEDIATE_CONFIRM
            });
            const payload = new RawPayload({ confirmed: 'Hi Worker 2. I confirm!' });
            intermediateConfirm.addPayload(payload);

            this.icph.postMessageOnPort('com2', intermediateConfirm);
        }, 2000);
    }

    interComIntermediateConfirm(message: WorkerMessage): void {
        const rawPayload = message.payloads[0] as RawPayload;
        this.text = `Worker 1: Worker 2 confirmed: ${rawPayload.message.raw.confirmed}`;
        this.updateText();

        // after receiving the interComIntermediateConfirm from Com2Worker, send execComplete to main
        const execComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
        });
        const payload = new RawPayload({ finished: 'Hi Main. Worker 1 completed!' });
        execComplete.addPayload(payload);
        self.postMessage(execComplete);
    }

    private updateText(log: boolean = true) {
        updateText({
            text: this.text,
            width: this.offScreenCanvas?.width ?? 0,
            height: this.offScreenCanvas?.height ?? 0,
            canvas: this.offScreenCanvas as unknown as HTMLCanvasElement,
            log
        });
    }
}

const worker = new Com1Worker();
self.onmessage = message => comRouting(worker, message);

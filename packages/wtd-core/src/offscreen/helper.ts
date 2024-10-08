import { WorkerTask } from '../WorkerTask.js';
import { WorkerMessage } from '../WorkerMessage.js';
import { OffscreenPayload } from './OffscreenPayload.js';
import { OffscreenWorkerCommandRequest, OffscreenWorkerCommandResponse } from './OffscreenWorker.js';

export const getOffscreenCanvas = (offScreenPayload?: OffscreenPayload) => {
    return offScreenPayload ? offScreenPayload.message.drawingSurface as OffscreenCanvas : undefined;
};

export const initOffscreenCanvas = async (workerTask: WorkerTask, canvas: HTMLCanvasElement) => {
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const offscreenPayloadRenderer = new OffscreenPayload({
        drawingSurface: offscreenCanvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        pixelRatio: window.devicePixelRatio
    });
    await workerTask.sentMessage({
        message: WorkerMessage.fromPayload(offscreenPayloadRenderer, OffscreenWorkerCommandRequest.INIT_OFFSCREEN_CANVAS),
        transferables: [offscreenCanvas],
        awaitAnswer: true,
        expectedAnswer: OffscreenWorkerCommandResponse.INIT_OFFSCREEN_CANVAS_COMPLETE
    });
};

export const recalcAspectRatio = (canvas: HTMLCanvasElement | OffscreenCanvas, clientWidth: number, clientHeight: number) => {
    canvas.width = canvas.height * (clientWidth / clientHeight);
    return canvas.width;
};

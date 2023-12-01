import { WorkerTask } from '../WorkerTask.js';
import { WorkerTaskMessage } from '../WorkerTaskMessage.js';
import { OffscreenPayload } from './OffscreenPayload.js';
import { OffscreenWorkerCommandRequest, OffscreenWorkerCommandResponse } from './OffscreenWorker.js';

export const initOffscreenCanvas = async (workerTask: WorkerTask, canvas: HTMLCanvasElement) => {
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const offscreenPayloadRenderer = new OffscreenPayload({
        drawingSurface: offscreenCanvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        pixelRatio: window.devicePixelRatio
    });
    return workerTask.sentMessage({
        message: WorkerTaskMessage.fromPayload(offscreenPayloadRenderer, OffscreenWorkerCommandRequest.INIT_OFFSCREEN_CANVAS),
        transferables: [offscreenCanvas],
        awaitAnswer: true,
        answer: OffscreenWorkerCommandResponse.INIT_OFFSCREEN_CANVAS_COMPLETE
    });
};

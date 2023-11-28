import { WorkerTask } from '../WorkerTask.js';
import { WorkerTaskMessage } from '../WorkerTaskMessage.js';
import { OffscreenPayload } from './OffscreenPayload.js';
import { OffscreenWorkerCommandRequest } from './OffscreenWorker.js';

export const initOffscreenCanvas = (workerTask: WorkerTask, canvas: HTMLCanvasElement) => {
    const offscreenCanvas = canvas.transferControlToOffscreen();
    const offscreenPayloadRenderer = new OffscreenPayload({
        drawingSurface: offscreenCanvas,
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        pixelRatio: window.devicePixelRatio
    });
    workerTask.sentMessage({
        message: WorkerTaskMessage.fromPayload(offscreenPayloadRenderer, OffscreenWorkerCommandRequest.INIT_OFFSCREEN_CANVAS),
        transferables: [offscreenCanvas]
    });
};

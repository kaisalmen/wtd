import { WorkerTaskMessageConfig } from '../WorkerTaskMessage.js';

export enum OffscreenWorkerCommandRequest {
    INIT_OFFSCREEN_CANVAS = 'initOffscreenCanvas',
    PROXY_START = 'proxyStart',
    PROXY_EVENT = 'proxyEvent',
    RESIZE = 'resize'
}

export enum OffscreenWorkerCommandResponse {
    INIT_OFFSCREEN_CANVAS_COMPLETE = 'initOffscreenCanvasComplete',
    PROXY_START_COMPLETE = 'proxyStartComplete',
    PROXY_EVENT_COMPLETE = 'proxyEventComplete',
    RESIZE_COMPLETE = 'resizeComplete'
}

export type OffscreenWorker = {

    initOffscreenCanvas(message: WorkerTaskMessageConfig): void;

    proxyStart?(message: WorkerTaskMessageConfig): void;

    proxyEvent?(message: WorkerTaskMessageConfig): void;

    resize?(message: WorkerTaskMessageConfig): void;
}

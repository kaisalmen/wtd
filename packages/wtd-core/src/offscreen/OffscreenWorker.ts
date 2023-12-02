import { WorkerTaskMessage } from '../WorkerTaskMessage.js';

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
    initOffscreenCanvas(message: WorkerTaskMessage): void;
    proxyStart?(message: WorkerTaskMessage): void;
    proxyEvent?(message: WorkerTaskMessage): void;
    resize?(message: WorkerTaskMessage): void;
}

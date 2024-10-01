import { WorkerMessage } from '../WorkerMessage.js';

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

export interface OffscreenWorker {
    initOffscreenCanvas(message: WorkerMessage): void;
    proxyStart?(message: WorkerMessage): void;
    proxyEvent?(message: WorkerMessage): void;
    resize?(message: WorkerMessage): void;
}

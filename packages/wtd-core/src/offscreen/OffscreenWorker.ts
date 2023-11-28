import { WorkerTaskMessageConfig } from '../WorkerTaskMessage.js';

export enum OffscreenWorkerCommandRequest {
    INIT_OFFSCREEN_CANVAS = 'initOffscreenCanvas',
    PROXY_START = 'proxyStart',
    PROXY_EVENT = 'proxyEvent',
    RESIZE = 'resize'
}

export type OffscreenWorker = {

    initOffscreenCanvas(message: WorkerTaskMessageConfig): void;

    proxyStart?(message: WorkerTaskMessageConfig): void;

    proxyEvent?(message: WorkerTaskMessageConfig): void;

    resize?(message: WorkerTaskMessageConfig): void;
}

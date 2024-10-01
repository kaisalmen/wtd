import { AssociatedArrayType, Payload } from 'wtd-core';

export interface OffscreenPayloadMessage {
    drawingSurface?: OffscreenCanvas | HTMLCanvasElement;
    width?: number;
    height?: number;
    pixelRatio?: number;
    top?: number;
    left?: number;
    event?: AssociatedArrayType<unknown>;
}

export interface OffscreenPayloadAdditions extends Payload {
    message: OffscreenPayloadMessage;
}

export class OffscreenPayload implements OffscreenPayloadAdditions {
    $type = 'OffscreenPayload';
    message: OffscreenPayloadMessage;

    constructor(message: OffscreenPayloadMessage) {
        this.message = message;
    }
}

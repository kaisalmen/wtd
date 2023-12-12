import { AssociatedArrayType, Payload } from 'wtd-core';

export type OffscreenPayloadMessage = {
    drawingSurface?: OffscreenCanvas | HTMLCanvasElement;
    width?: number;
    height?: number;
    pixelRatio?: number;
    top?: number;
    left?: number;
    event?: AssociatedArrayType<unknown>;
}

export type OffscreenPayloadAdditions = Payload & {
    message: OffscreenPayloadMessage;
}

export class OffscreenPayload implements OffscreenPayloadAdditions {
    $type = 'OffscreenPayload';
    message: OffscreenPayloadMessage;

    constructor(message: OffscreenPayloadMessage) {
        this.message = message;
    }
}

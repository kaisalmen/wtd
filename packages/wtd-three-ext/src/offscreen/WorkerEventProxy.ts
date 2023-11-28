/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    EventDispatcher
} from 'three';
import { AssociatedArrayType } from 'wtd-core';

export const noop = () => {
};

export class ElementProxyReceiver extends EventDispatcher {
    top = 0;
    left = 0;
    clientLeft = 0;
    clientTop = 0;
    pageXOffset = 0;
    pageYOffset = 0;
    style = {};
    ownerDocument = {
        documentElement: {}
    };
    offscreenCanvas: OffscreenCanvas = new OffscreenCanvas(100, 100);

    constructor() {
        super();
        this.ownerDocument.documentElement = this;
    }

    merge(offscreenCanvas: OffscreenCanvas) {
        this.offscreenCanvas = offscreenCanvas;
        this.width = offscreenCanvas.width;
        this.height = offscreenCanvas.height;
        this.oncontextlost = offscreenCanvas.oncontextlost;
        this.oncontextrestored = offscreenCanvas.oncontextrestored;
    }

    oncontextlost: ((this: OffscreenCanvas, ev: Event) => any) | null = null;
    oncontextrestored: ((this: OffscreenCanvas, ev: Event) => any) | null = null;
    getContext(contextId: any, options?: any): OffscreenCanvasRenderingContext2D | null {
        return this.offscreenCanvas.getContext(contextId, options) ?? null;
    }
    transferToImageBitmap(): ImageBitmap {
        return this.offscreenCanvas.transferToImageBitmap();
    }
    convertToBlob(options?: ImageEncodeOptions): Promise<Blob> {
        return this.offscreenCanvas.convertToBlob(options);
    }

    get height() {
        return this.offscreenCanvas.height;
    }

    set height(value: number) {
        this.offscreenCanvas.height = value;
    }

    get width() {
        return this.offscreenCanvas.width;
    }

    set width(value: number) {
        this.offscreenCanvas.width = value;
    }

    get clientWidth() {
        return this.width;
    }

    get clientHeight() {
        return this.height;
    }

    setPointerCapture(_id: string) {
        noop();
    }

    releasePointerCapture(_id: string) {
        noop();
    }

    getBoundingClientRect() {
        return {
            left: this.left,
            top: this.top,
            width: this.width,
            height: this.height,
            right: this.left + this.width,
            bottom: this.top + this.height,
        };
    }

    handleEvent(event: AssociatedArrayType<unknown>) {
        event.preventDefault = noop;
        event.stopPropagation = noop;
        this.dispatchEvent(event as never);
    }

    focus() {
        noop();
    }
}

export const proxyStart = (proxy: ElementProxyReceiver) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    self.window = proxy as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (self as any).document = {
        addEventListener: proxy.addEventListener.bind(proxy),
        removeEventListener: proxy.removeEventListener.bind(proxy),
    };
};

import {
    EventDispatcher
} from 'three';
import { AssociatedArrayType } from 'wtd-core';

export const noop = () => {
};

export class ElementProxyReceiver extends EventDispatcher {
    width = 1000;
    height = 1000;
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

    constructor() {
        super();
        // this.handleEvent = this.handleEvent.bind(this);
        this.ownerDocument.documentElement = this;
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

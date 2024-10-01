/**
 * Inspired by:
 * https://threejs.org/manual/#en/offscreencanvas
 * https://jsfiddle.net/greggman/kuLdptmq/17/
 */

import { AssociatedArrayType } from '../Payload.js';
import { WorkerTask } from '../WorkerTask.js';
import { WorkerMessage } from '../WorkerMessage.js';
import { OffscreenPayload } from './OffscreenPayload.js';
import { OffscreenWorkerCommandRequest, OffscreenWorkerCommandResponse } from './OffscreenWorker.js';

export const handlePreventDefault = (event: Event) => {
    event.preventDefault();
};

export const MouseEventProperties = [
    'ctrlKey',
    'metaKey',
    'shiftKey',
    'button',
    'pointerType',
    'pointerId',
    'clientX',
    'clientY',
    'pageX',
    'pageY',
];

export const handleMouseEvent = (event: Event, workerTask: WorkerTask, properties?: string[]) => {
    const offscreenPayload = extractProperties(event, properties);
    workerTask.sentMessage({
        message: WorkerMessage.fromPayload(offscreenPayload, 'proxyEvent')
    });
};

export const WheelEventProperties = [
    'deltaX',
    'deltaY',
];

export const handleWheelEvent = (event: Event, workerTask: WorkerTask, properties?: string[]) => {
    const offscreenPayload = extractProperties(event, properties);
    workerTask.sentMessage({
        message: WorkerMessage.fromPayload(offscreenPayload, 'proxyEvent')
    });
};

export const KeydownEventProperties = [
    'ctrlKey',
    'altKey',
    'metaKey',
    'shiftKey',
    'code',
];

// The four arrow keys
export const AllowedKeyProperties = [
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
    'KeyW',
    'KeyA',
    'KeyS',
    'KeyD'
];

export const handleFilteredKeydownEvent = (event: Event, workerTask: WorkerTask, properties?: string[], positiveList?: string[]) => {
    const { code } = event as KeyboardEvent;
    if (positiveList !== undefined && positiveList.includes(code)) {
        const offscreenPayload = extractProperties(event, properties);
        workerTask.sentMessage({
            message: WorkerMessage.fromPayload(offscreenPayload, 'proxyEvent')
        });
    }
};

export const extractProperties = (event: Event, properties?: string[]) => {
    const eventTarget = {
        type: event.type,
    } as AssociatedArrayType<unknown>;
    if (properties) {
        for (const name of properties) {
            eventTarget[name] = (event as unknown as AssociatedArrayType<unknown>)[name];
        }
    }
    return new OffscreenPayload({
        event: eventTarget
    });
};

export const handleTouchEvent = (event: Event, workerTask: WorkerTask) => {
    const touches = [];
    const touchEvent = event as TouchEvent;

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < touchEvent.touches.length; ++i) {
        const touch = touchEvent.touches[i];
        touches.push({
            pageX: touch.pageX,
            pageY: touch.pageY,
        });
    }
    const offscreenPayload = new OffscreenPayload({
        event: {
            type: event.type,
            touches
        }
    });
    workerTask.sentMessage({
        message: WorkerMessage.fromPayload(offscreenPayload, OffscreenWorkerCommandRequest.PROXY_EVENT)
    });
};

export type HandlingInstructions = {
    handler: (event: Event, workerTask: WorkerTask, properties?: string[], positiveList?: string[]) => void;
    properties?: string[];
    positiveList?: string[];
    passive?: boolean;
};

export const buildDefaultEventHandlingInstructions = (): Map<string, HandlingInstructions> => {
    const handlingInstructions: Map<string, HandlingInstructions> = new Map();
    const contextMenuInstruction: HandlingInstructions = {
        handler: handlePreventDefault
    };
    const mouseInstruction: HandlingInstructions = {
        handler: handleMouseEvent,
        properties: MouseEventProperties
    };
    const wheelInstruction: HandlingInstructions = {
        handler: handleWheelEvent,
        properties: WheelEventProperties,
        passive: true
    };
    const keyboardInstruction: HandlingInstructions = {
        handler: handleFilteredKeydownEvent,
        properties: KeydownEventProperties,
        positiveList: AllowedKeyProperties
    };
    const touchInstruction: HandlingInstructions = {
        handler: handleTouchEvent,
        passive: true
    };

    handlingInstructions.set('contextmenu', contextMenuInstruction);
    handlingInstructions.set('mousedown', mouseInstruction);
    handlingInstructions.set('mousemove', mouseInstruction);
    handlingInstructions.set('mouseup', mouseInstruction);
    handlingInstructions.set('pointerdown', mouseInstruction);
    handlingInstructions.set('pointermove', mouseInstruction);
    handlingInstructions.set('pointerup', mouseInstruction);
    handlingInstructions.set('wheel', wheelInstruction);
    handlingInstructions.set('keydown', keyboardInstruction);
    handlingInstructions.set('touchstart', touchInstruction);
    handlingInstructions.set('touchmove', touchInstruction);
    handlingInstructions.set('touchend', touchInstruction);
    return handlingInstructions;
};

export const registerCanvas = async (workerTask: WorkerTask, canvas: HTMLCanvasElement, handlingInstructions: Map<string, HandlingInstructions>) => {
    canvas.focus();

    await workerTask.sentMessage({
        message: WorkerMessage.fromPayload(new OffscreenPayload({}), OffscreenWorkerCommandRequest.PROXY_START),
        awaitAnswer: true,
        answer: OffscreenWorkerCommandResponse.PROXY_START_COMPLETE
    });

    for (const [eventName, instruction] of handlingInstructions.entries()) {
        if (eventName.startsWith('key')) {
            window.addEventListener(eventName, (event: Event) => {
                instruction.handler(event, workerTask, instruction.properties, instruction.positiveList);
            }, instruction.passive === true ? { passive: true } : undefined);
        } else {
            canvas.addEventListener(eventName, (event: Event) => {
                instruction.handler(event, workerTask, instruction.properties);
            }, instruction.passive === true ? { passive: true } : undefined);
        }
    }
};

export const sentResize = (workerTask: WorkerTask, canvas: HTMLCanvasElement) => {
    const dataPayload = new OffscreenPayload({
        width: canvas.offsetWidth,
        height: canvas.offsetHeight,
        pixelRatio: window.devicePixelRatio
    });
    workerTask.sentMessage({
        message: WorkerMessage.fromPayload(dataPayload, OffscreenWorkerCommandRequest.RESIZE),
    });
};

export const registerResizeHandler = (workerTask: WorkerTask, canvas: HTMLCanvasElement,) => {
    window.addEventListener('resize', () => sentResize(workerTask, canvas), false);
};

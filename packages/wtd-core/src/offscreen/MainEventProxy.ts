/**
 * Inspired by:
 * https://threejs.org/manual/#en/offscreencanvas
 * https://jsfiddle.net/greggman/kuLdptmq/17/
 */

import { AssociatedArrayType } from '../Payload.js';
import { WorkerTask } from '../WorkerTask.js';
import { WorkerTaskMessage } from '../WorkerTaskMessage.js';
import { OffscreenPayload } from './OffscreenPayload.js';

export const preventDefaultHandler = (event: Event) => {
    event.preventDefault();
};

export const mouseEventProperties = [
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

export const mouseEventHandler = (event: Event, workerTask: WorkerTask, properties?: string[]) => {
    const offscreenPayload = extractProperties(event, properties);
    workerTask.sentMessage(WorkerTaskMessage.fromPayload(offscreenPayload, 'proxyEvent'));
};

export const wheelEventProperties = [
    'deltaX',
    'deltaY',
];

export const wheelEventHandler = (event: Event, workerTask: WorkerTask, properties?: string[]) => {
    const offscreenPayload = extractProperties(event, properties);
    workerTask.sentMessage(WorkerTaskMessage.fromPayload(offscreenPayload, 'proxyEvent'));
};

export const keydownEventProperties = [
    'ctrlKey',
    'altKey',
    'metaKey',
    'shiftKey',
    'code',
];

// The four arrow keys
export const allowedKeys = [
    'ArrowLeft',
    'ArrowUp',
    'ArrowRight',
    'ArrowDown',
    'KeyA',
    'KeyS',
    'KeyD'
];

export const filteredKeydownEventHandler = (event: Event, workerTask: WorkerTask, properties?: string[], positiveList?: string[]) => {
    const { code } = event as KeyboardEvent;
    if (positiveList?.includes(code)) {
        const offscreenPayload = extractProperties(event, properties);
        workerTask.sentMessage(WorkerTaskMessage.fromPayload(offscreenPayload, 'proxyEvent'));
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

export const touchEventHandler = (event: Event, workerTask: WorkerTask) => {
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
    workerTask.sentMessage(WorkerTaskMessage.fromPayload(offscreenPayload, 'proxyEvent'));
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
        handler: preventDefaultHandler
    };
    const mouseInstruction: HandlingInstructions = {
        handler: mouseEventHandler,
        properties: mouseEventProperties
    };
    const wheelInstruction: HandlingInstructions = {
        handler: wheelEventHandler,
        properties: wheelEventProperties,
        passive: true
    };
    const keyboardInstruction: HandlingInstructions = {
        handler: filteredKeydownEventHandler,
        properties: keydownEventProperties,
        positiveList: allowedKeys
    };
    const touchInstruction: HandlingInstructions = {
        handler: touchEventHandler,
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

export const registerCanvas = (canvas: HTMLCanvasElement, workerTask: WorkerTask, handlingInstructions: Map<string, HandlingInstructions>) => {
    canvas.focus();

    workerTask.sentMessage(WorkerTaskMessage.fromPayload(new OffscreenPayload({}), 'proxyStart'));

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

export const registerResizeHandler = (canvas: HTMLCanvasElement, workerTask: WorkerTask) => {
    const resize = () => {
        const dataPayload = new OffscreenPayload({
            width: canvas.offsetWidth,
            height: canvas.offsetHeight,
            pixelRatio: window.devicePixelRatio
        });
        workerTask.sentMessage(WorkerTaskMessage.fromPayload(dataPayload, 'resize'));
    };

    window.addEventListener('resize', () => resize(), false);
};

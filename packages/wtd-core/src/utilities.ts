import { AssociatedArrayType } from './Payload.js';
import { RawPayload } from './RawPayload.js';
import { WorkerTask } from './WorkerTask.js';
import { WorkerMessage } from './WorkerMessage.js';
import { WorkerTaskCommandRequest, WorkerTaskCommandResponse } from './WorkerTaskWorker.js';

export const fillTransferables = (buffers: IterableIterator<ArrayBufferLike>, transferables: Transferable[], cloneBuffers: boolean) => {
    for (const buffer of buffers) {
        if (cloneBuffers) {
            transferables.push(buffer.slice(0));
        } else {
            if (Object.hasOwn(buffer, 'buffer')) {
                transferables.push(buffer);
            }
        }
    }
};

/**
 * Applies values from parameter object via set functions or via direct assignment.
 *
 * @param {object} objToAlter The objToAlter instance
 * @param {AssociatedArrayType} params The parameter object
 * @param {boolean} forceCreation Force the creation of a property
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const applyProperties = (objToAlter: any, params?: AssociatedArrayType<unknown | string | object>, forceCreation?: boolean) => {
    if (!params) return;

    for (const [k, v] of Object.entries(params)) {
        const funcName = 'set' + k.substring(0, 1).toLocaleUpperCase() + k.substring(1);

        if (Object.prototype.hasOwnProperty.call(objToAlter, funcName) && typeof objToAlter[funcName] === 'function') {
            objToAlter[funcName] = v;
        }
        else if (Object.prototype.hasOwnProperty.call(objToAlter, k) || forceCreation === true) {
            objToAlter[k] = v;
        }
    }
};

export const createWorkerBlob = (code: string[]) => {
    const simpleWorkerBlob = new Blob(code, { type: 'application/javascript' });
    return window.URL.createObjectURL(simpleWorkerBlob);
};

export const initChannel = async (workerOne: WorkerTask, workerTwo: WorkerTask) => {
    const channel = new MessageChannel();

    const promises = [];
    const payloadOne = new RawPayload({
        port: channel.port1
    });
    promises.push(workerOne.sentMessage({
        message: WorkerMessage.fromPayload(payloadOne, WorkerTaskCommandRequest.INIT_CHANNEL),
        transferables: [channel.port1],
        awaitAnswer: true,
        answer: WorkerTaskCommandResponse.INIT_CHANNEL_COMPLETE
    }));

    const payloadTwo = new RawPayload({
        port: channel.port2
    });
    promises.push(workerTwo.sentMessage({
        message: WorkerMessage.fromPayload(payloadTwo, WorkerTaskCommandRequest.INIT_CHANNEL),
        transferables: [channel.port2],
        awaitAnswer: true,
        answer: WorkerTaskCommandResponse.INIT_CHANNEL_COMPLETE
    }));
    return Promise.all(promises);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const comRouting = (workerImpl: any, message: MessageEvent<unknown>) => {
    const data = (message as MessageEvent).data;
    if (Object.hasOwn(data, 'cmd')) {
        const wm = (message as MessageEvent).data as WorkerMessage;
        const funcName = wm.cmd;

        // only invoke if not flagged as amswer
        if (wm.answer === undefined || wm.answer === false) {
            if (typeof workerImpl[funcName] === 'function') {
                workerImpl[funcName](wm);
            } else {
                console.warn(`No function "${funcName}" found on workerImpl.`);
            }
        }
    } else {
        console.error(`Received: unknown message: ${message}`);
    }
};

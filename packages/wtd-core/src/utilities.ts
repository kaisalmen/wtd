import { AssociatedArrayType } from './Payload.js';
import { RawPayload } from './RawPayload.js';
import { WorkerTask } from './WorkerTask.js';
import { WorkerTaskMessage } from './WorkerTaskMessage.js';
import { WorkerTaskCommandRequest } from './index.js';

export const fillTransferables = (buffers: IterableIterator<ArrayBufferLike>, transferables: Transferable[], cloneBuffers: boolean) => {
    for (const buffer of buffers) {
        const potentialClone = cloneBuffers ? buffer.slice(0) : buffer;

        const outputBuffer = (potentialClone as Uint8Array).buffer;
        if (outputBuffer) {
            transferables.push(outputBuffer);
        }
        else {
            transferables.push(potentialClone);
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
        else if (Object.prototype.hasOwnProperty.call(objToAlter, k) || forceCreation) {
            objToAlter[k] = v;
        }
    }
};

export const createWorkerBlob = (code: string[]) => {
    const simpleWorkerBlob = new Blob(code, { type: 'application/javascript' });
    return window.URL.createObjectURL(simpleWorkerBlob);
};

export const extractDelegate = (scope: DedicatedWorkerGlobalScope | Worker): ((ev: MessageEvent<unknown>) => unknown) | undefined => {
    let delegate: ((ev: MessageEvent<unknown>) => unknown) | undefined = undefined;
    if (scope.onmessage !== undefined) {
        delegate = scope.onmessage as (ev: MessageEvent<unknown>) => unknown;
    }
    return delegate;
};

export const initChannel = (workerOne: WorkerTask, workerTwo: WorkerTask) => {
    const channel = new MessageChannel();
    const payloadOne = new RawPayload({
        port: channel.port1
    });
    workerOne.sentMessage({
        message: WorkerTaskMessage.fromPayload(payloadOne, WorkerTaskCommandRequest.INIT_CHANNEL),
        transferables: [channel.port1]
    });

    const payloadTwo = new RawPayload({
        port: channel.port2
    });
    workerTwo.sentMessage({
        message: WorkerTaskMessage.fromPayload(payloadTwo, WorkerTaskCommandRequest.INIT_CHANNEL),
        transferables: [channel.port2]
    });
};


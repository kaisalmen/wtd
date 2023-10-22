export type AssociatedArrayType<T> = { [key: string]: T }

export type Payload = {
    $type: string;
    message: unknown;
}

export type PayloadHandler = {
    pack(payload: Payload, transferable: Transferable[], cloneBuffers: boolean): Transferable[];
    unpack(transportObject: Payload, cloneBuffers: boolean): Payload;
}

export class PayloadRegister {
    static handler = new Map<string, PayloadHandler>();
}

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

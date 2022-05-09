export type DataPayloadType = {
    type: string;
    params?: Record<string, unknown>;
    buffers?: Map<string, ArrayBufferLike>;
}

export class DataPayload implements DataPayloadType {
    static TYPE = 'DataPayload';
    type = DataPayload.TYPE;
    params?: Record<string, unknown> = {};
    buffers: Map<string, ArrayBufferLike> = new Map();
    progress = 0;
}

export interface PayloadHandler {

    pack(payload: DataPayload, transferable: Transferable[], cloneBuffers: boolean): Transferable[];

    unpack(transportObject: DataPayloadType, cloneBuffers: boolean): DataPayload;

}

export class PayloadRegister {

    static handler = new Map<string, PayloadHandler>();
}

export class DataPayloadHandler implements PayloadHandler {

    static pack(payload: DataPayload, transferables: Transferable[], cloneBuffers: boolean) {
        const handler = PayloadRegister.handler.get(DataPayload.TYPE);
        return handler ? handler.pack(payload, transferables, cloneBuffers) : undefined;
    }

    pack(payload: DataPayload, transferables: Transferable[], cloneBuffers: boolean): Transferable[] {
        DataPayloadHandler.fillTransferables(payload.buffers.values(), transferables, cloneBuffers);
        return transferables;
    }

    static fillTransferables(buffers: IterableIterator<ArrayBufferLike>, transferables: Transferable[], cloneBuffers: boolean) {
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
    }

    static unpack(transportObject: DataPayloadType, cloneBuffers: boolean) {
        const handler = PayloadRegister.handler.get(DataPayload.TYPE);
        return handler ? handler.unpack(transportObject, cloneBuffers) : undefined;
    }

    unpack(transportObject: DataPayloadType, cloneBuffers: boolean): DataPayload {
        const dtp = Object.assign(new DataPayload(), transportObject);
        if (transportObject.buffers) {
            for (const [name, buffer] of transportObject.buffers.entries()) {
                dtp.buffers.set(name, cloneBuffers ? buffer.slice(0) : buffer);
            }
        }
        return dtp;
    }

    /**
     * Applies values from parameter object via set functions or via direct assignment.
     *
     * @param {Record<string, unknown>} objToAlter The objToAlter instance
     * @param {Record<string, unknown>} params The parameter object
     * @param {boolean} forceCreation Force the creation of a property
     */
    static applyProperties(objToAlter: Record<string, unknown>, params: Record<string, unknown>, forceCreation: boolean) {
        for (const [k, v] of Object.entries(params)) {
            const funcName = 'set' + k.substring(0, 1).toLocaleUpperCase() + k.substring(1);

            if (Object.prototype.hasOwnProperty.call(objToAlter, funcName) && typeof objToAlter[funcName] === 'function') {
                objToAlter[funcName] = v;
            }
            else if (Object.prototype.hasOwnProperty.call(objToAlter, k) || forceCreation) {
                objToAlter[k] = v;
            }
        }
    }
}

// register the default handler
PayloadRegister.handler.set(DataPayload.TYPE, new DataPayloadHandler());

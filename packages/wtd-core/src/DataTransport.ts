import { PayloadType } from './WorkerTask';

type DataTransportPayloadType = PayloadType & {
    buffers?: Map<string, ArrayBufferLike>;
    progress?: number;
};

export class DataTransportPayload implements DataTransportPayloadType {

    name = 'unnamed';
    type = 'DataTransportPayload';
    cmd = 'unknown';
    id = 0;
    workerId?: number | undefined = 0;
    params?: Record<string, unknown> = {};
    buffers: Map<string, ArrayBufferLike> = new Map();
    progress = 0;

    constructor(config: PayloadType) {
        this.cmd = config.cmd ?? this.cmd;
        this.id = config.id ?? this.id;
        this.name = config.name ?? this.name;
        this.workerId = config.workerId ?? this.workerId;
        this.params = config.params ?? this.params;
    }

}

export class DataTransportPayloadUtils {

    /**
     * Package all data buffers into the transferable array. Clone if data needs to stay in current context.
     * @param {boolean} cloneBuffers
     */
    static packDataTransportPayload(payload: DataTransportPayload, cloneBuffers: boolean): { payload: DataTransportPayload, transferables: Transferable[] } {
        const transferables: Transferable[] = [];
        DataTransportPayloadUtils.fillTransferables(payload.buffers.values(), transferables, cloneBuffers);

        return {
            payload: payload,
            transferables: transferables
        };
    }

    static fillTransferables(buffers: IterableIterator<ArrayBufferLike>, output: Transferable[], cloneBuffers: boolean) {
        for (const buffer of buffers) {
            const potentialClone = cloneBuffers ? buffer.slice(0) : buffer;

            const outputBuffer = (potentialClone as Uint8Array).buffer;
            if (outputBuffer) {
                output.push(outputBuffer);
            }
            else {
                output.push(potentialClone);
            }
        }
    }

    static unpackDataTransportPayload(payload: DataTransportPayload, cloneBuffers: boolean) {
        const dtp = Object.assign(new DataTransportPayload({}), payload);
        for (const [name, buffer] of payload.buffers.entries()) {
            dtp.buffers.set(name, cloneBuffers ? buffer.slice(0) : buffer);
        }
        return dtp;
    }
}

/**
 * Object manipulation utilities.
 */
export class ObjectManipulator {

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

import { PayloadType } from './WorkerTaskManager';

type DataTransportPayloadType = PayloadType & {
    buffers?: Map<string, ArrayBufferLike>;
    progress?: number;
};

export class DataTransportPayload implements DataTransportPayloadType {

    name = 'unnamed';
    type = 'DataTransportPayload';
    cmd = 'unknown';
    id: number;
    workerId?: number | undefined = 0;
    params?: Record<string, unknown> = {};
    buffers: Map<string, ArrayBufferLike> = new Map();
    progress = 0;

    constructor(cmd?: string, id?: number, name?: string) {
        if (cmd) {
            this.cmd = cmd;
        }
        this.id = id ?? 0;
        if (name) {
            this.name = name;
        }
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

    static fillTransferables(input: IterableIterator<ArrayBufferLike>, output: Transferable[], cloneBuffers: boolean) {
        for (const buffer of input) {
            output.push(cloneBuffers ? buffer.slice(0) : buffer);
        }
    }

    static unpackDataTransportPayload(payload: DataTransportPayload, cloneBuffers: boolean) {
        for (const [name, buffer] of payload.buffers.entries()) {
            payload.buffers.set(name, cloneBuffers ? buffer.slice(0) : buffer);
        }
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

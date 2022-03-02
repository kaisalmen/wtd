import { Payload } from '../workerTaskManager/WorkerTaskManager';

export class DataTransportPayload implements Payload {

    name = 'unknown';
    type = 'DataTransportPayload';
    cmd: string;
    id: number;
    workerId?: number | undefined = 0;
    params?: Record<string, unknown> = {};
    buffers: Map<string, ArrayBufferLike> = new Map();
    progress = 0;

    constructor(cmd?: string, id?: number) {
        this.cmd = (cmd !== undefined) ? cmd : 'unknown';
        this.id = (id !== undefined) ? id : 0;
    }

    addBuffer(name: string, buffer: ArrayBuffer): void {
        this.buffers.set(name, buffer);
    }

    getBuffer(name: string): ArrayBufferLike | undefined {
        return this.buffers.get(name);
    }

    reconstructBuffers(input: Map<string, ArrayBufferLike>, cloneBuffers?: boolean) {
        for (const [name, buffer] of input) {
            const potentialClone = cloneBuffers ? buffer.slice(0) : buffer;
            this.buffers.set(name, potentialClone);
        }
    }

    fillTransferables(input: IterableIterator<ArrayBufferLike>, output: Transferable[], cloneBuffers: boolean) {
        for (const buffer of input) {
            const potentialClone = cloneBuffers ? buffer.slice(0) : buffer;
            output.push((potentialClone as Uint8Array).buffer);
        }
    }
}

/**
 * Define a base structure that is used to ship data in between main and workers.
 */
export class DataTransport {

    private payload: DataTransportPayload;

    /**
     * Creates a new {@link DataTransport}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.payload = new DataTransportPayload(cmd, id);
    }

    getPayload(): DataTransportPayload {
        return this.payload;
    }

    /**
     * Populate this object with previously serialized data.
     * @param {Payload} transportObject
     */
    loadData(transportObject: DataTransportPayload, cloneBuffers?: boolean): void {
        this.payload = Object.assign(new DataTransportPayload(), transportObject);
        this.payload.reconstructBuffers(transportObject.buffers, cloneBuffers);
    }

    /**
     * Package all data buffers into the transferable array. Clone if data needs to stay in current context.
     * @param {boolean} cloneBuffers
     */
    package(cloneBuffers: boolean): { payload: DataTransportPayload, transferables: Transferable[] } {
        const transferables: Transferable[] = [];
        this.payload.fillTransferables(this.payload.buffers.values(), transferables, cloneBuffers);

        return {
            payload: this.payload,
            transferables: transferables
        };
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

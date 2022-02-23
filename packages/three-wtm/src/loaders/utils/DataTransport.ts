import { Payload } from '../..';

export type DataTransportDef = Payload & {
    type: string;
    progress: number;
    buffers: Map<string, ArrayBufferLike>;
};

export function buildDataTransport(type: string, cmd?: string, id?: number): DataTransportDef {
    return {
        name: 'DataTransportDef',
        cmd: (cmd !== undefined) ? cmd : 'unknown',
        id: (id !== undefined) ? id : 0,
        type: type,
        progress: 0,
        buffers: new Map(),
        params: {
        }
    };
}

export function copyBuffers(input: Map<string, ArrayBuffer>, output: Transferable[], cloneBuffers: boolean) {
    for (const buffer of Object.values(input)) {
        if (buffer !== null && buffer !== undefined) {
            const potentialClone = cloneBuffers ? buffer.slice(0) : buffer;
            output.push(potentialClone);
        }
    }
}

/**
 * @param {unknown} params
 * @return {MeshTransport}
 */
export function setParams(input: Record<string, unknown> | undefined, params: Record<string, unknown> | undefined) {
    if (input && params) {
        input.params = params;
    }
}

/**
 * Define a base structure that is used to ship data in between main and workers.
 */
export class DataTransport {

    private main: DataTransportDef;
    private transferables: Transferable[];

    /**
     * Creates a new {@link DataTransport}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.main = buildDataTransport('DataTransport', cmd, id);
        this.transferables = [];
    }

    /**
     * Populate this object with previously serialized data.
     * @param {DataTransportDef} transportObject
     * @return {DataTransport}
     */
    loadData(transportObject: DataTransportDef): DataTransport {
        this.main = buildDataTransport('DataTransport', transportObject.cmd, transportObject.id);
        this.setProgress(transportObject.progress);
        this.setParams(transportObject.params);

        if (transportObject.buffers) {
            Object.entries(transportObject.buffers).forEach(([name, buffer]) => {
                this.main.buffers.set(name, buffer);
            });
        }
        return this;
    }

    /**
     * Returns the value of the command.
     * @return {string}
     */
    getCmd(): string {
        return this.main.cmd;
    }

    /**
     * Returns the id.
     * @return {number}
     */
    getId(): number {
        return this.main.id;
    }

    /**
      * @param {Record<string, unknown>} params
      * @return {DataTransport}
      */
    setParams(params: Record<string, unknown> | undefined): DataTransport {
        setParams(this.main.params, params);
        return this;
    }

    /**
     * Return the parameter object
     * @return {unknown}
     */
    getParams(): unknown {
        return this.main.params;
    }

    /**
     * Set the current progress (e.g. percentage of progress)
     * @param {number} numericalValue
     * @return {DataTransport}
     */
    setProgress(numericalValue: number): DataTransport {
        this.main.progress = numericalValue;
        return this;
    }

    /**
     * Add a named {@link ArrayBuffer}
     * @param {string} name
     * @param {ArrayBuffer} buffer
     * @return {DataTransport}
     */
    addBuffer(name: string, buffer: ArrayBuffer): DataTransport {
        this.main.buffers.set(name, buffer);
        return this;
    }

    /**
     * Retrieve an {@link ArrayBuffer} by name
     * @param {string} name
     * @return {ArrayBuffer}
     */
    getBuffer(name: string) {
        return this.main.buffers.get(name);
    }

    /**
     * Package all data buffers into the transferable array. Clone if data needs to stay in current context.
     * @param {boolean} cloneBuffers
     * @return {DataTransport}
     */
    package(cloneBuffers: boolean): DataTransport {
        copyBuffers(this.main.buffers, this.transferables, cloneBuffers);
        return this;
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

import { Box3, BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Sphere } from 'three';
import { buildDataTransport, copyBuffers, DataTransportDef, setParams } from './DataTransport';

export type GeometryTransportDef = DataTransportDef & {
    // 0: mesh, 1: line, 2: point
    geometryType: 0 | 1 | 2;
    geometry: BufferGeometry | Record<string, never>;
    bufferGeometry: BufferGeometry | undefined;
};

function buildGeometryTransport(cmd?: string, id?: number): GeometryTransportDef {
    const geometryTransportDef = buildDataTransport('GeometryTransport', cmd, id) as GeometryTransportDef;
    geometryTransportDef.geometryType = 0;
    geometryTransportDef.geometry = {};
    geometryTransportDef.bufferGeometry = undefined;
    return geometryTransportDef;
}

/**
 * Package {@link BufferGeometry} and prepare it for transport.
 *
 * @param {boolean} cloneBuffers Clone buffers if their content shall stay in the current context.
 */
export function packageBuffer(cloneBuffers: boolean, buffers: Map<string, ArrayBuffer>,
    transferables: ArrayBuffer[], geometry: BufferGeometry | Record<string, never>) {

    // fast-fail
    if (!(geometry instanceof BufferGeometry)) return;

    copyBuffers(buffers, transferables, cloneBuffers);
    const vertexBA = geometry.getAttribute('position');
    const normalBA = geometry.getAttribute('normal');
    const uvBA = geometry.getAttribute('uv');
    const colorBA = geometry.getAttribute('color');
    const skinIndexBA = geometry.getAttribute('skinIndex');
    const skinWeightBA = geometry.getAttribute('skinWeight');
    const indexBA = geometry.getIndex();

    addBufferAttributeToTransferable(vertexBA, cloneBuffers, transferables);
    addBufferAttributeToTransferable(normalBA, cloneBuffers, transferables);
    addBufferAttributeToTransferable(uvBA, cloneBuffers, transferables);
    addBufferAttributeToTransferable(colorBA, cloneBuffers, transferables);
    addBufferAttributeToTransferable(skinIndexBA, cloneBuffers, transferables);
    addBufferAttributeToTransferable(skinWeightBA, cloneBuffers, transferables);
    addBufferAttributeToTransferable(indexBA, cloneBuffers, transferables);
}

/**
 * Reconstructs the {@link BufferGeometry} from the raw buffers.
 * @param {boolean} cloneBuffers
 * @return {GeometryTransport}
 */
export function reconstructBuffer(cloneBuffers: boolean, bufferGeometry: BufferGeometry | undefined,
    transferredGeometry: BufferGeometry | Record<string, never>) {

    // fast-fail: We already have a bufferGeometry
    if (bufferGeometry instanceof BufferGeometry) return;

    bufferGeometry = new BufferGeometry();
    assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.position, 'position', cloneBuffers);
    assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.normal, 'normal', cloneBuffers);
    assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.uv, 'uv', cloneBuffers);
    assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.color, 'color', cloneBuffers);
    assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.skinIndex, 'skinIndex', cloneBuffers);
    assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.skinWeight, 'skinWeight', cloneBuffers);

    const index = transferredGeometry.index;
    if (index !== null && index !== undefined) {
        const indexBuffer = cloneBuffers ? Array.from(index.array).slice(0) : index.array;
        bufferGeometry.setIndex(new BufferAttribute(indexBuffer, index.itemSize, index.normalized));
    }
    const boundingBox = transferredGeometry.boundingBox;
    if (boundingBox !== null) bufferGeometry.boundingBox = Object.assign(new Box3(), boundingBox);

    const boundingSphere = transferredGeometry.boundingSphere;
    if (boundingSphere !== null) bufferGeometry.boundingSphere = Object.assign(new Sphere(), boundingSphere);

    bufferGeometry.uuid = transferredGeometry.uuid;
    bufferGeometry.name = transferredGeometry.name;
    bufferGeometry.type = transferredGeometry.type;
    bufferGeometry.groups = transferredGeometry.groups;
    bufferGeometry.drawRange = transferredGeometry.drawRange;
    bufferGeometry.userData = transferredGeometry.userData;
}

function addBufferAttributeToTransferable(input: BufferAttribute | InterleavedBufferAttribute | null, cloneBuffer: boolean, transferables: ArrayBuffer[]): void {
    if (input !== null) {
        const arrayBuffer = (cloneBuffer ? Array.from(input.array).slice(0) : input.array) as unknown as ArrayBuffer;
        transferables.push(arrayBuffer);
    }
}

function assignAttributeFromTransferable(bufferGeometry: BufferGeometry, attr: BufferAttribute | InterleavedBufferAttribute, attrName: string, cloneBuffer: boolean): void {
    if (bufferGeometry instanceof BufferAttribute) {
        const arrayBuffer = cloneBuffer ? Array.from(attr.array).slice(0) : attr.array;
        bufferGeometry.setAttribute(attrName, new BufferAttribute(arrayBuffer, attr.itemSize, attr.normalized));
    }
}

/**
 * Define a structure that is used to send geometry data between main and workers.
 */
export class GeometryTransport {

    private main: GeometryTransportDef;
    private transferables: ArrayBuffer[];

    /**
     * Creates a new {@link GeometryTransport}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.main = buildGeometryTransport(cmd, id);
        this.transferables = [];
    }

    /**
     * @param {GeometryTransportDef} transportObject
     * @return {GeometryTransport}
     */
    loadData(transportObject: GeometryTransportDef): GeometryTransport {
        this.main = buildGeometryTransport(transportObject.cmd, transportObject.id);
        return this.setGeometry(transportObject.geometry, transportObject.geometryType);
    }

    /**
     * Returns the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @return {number}
     */
    getGeometryType() {
        return this.main.geometryType;
    }

    /**
      * @param {Record<string, unknown>} params
      * @return {GeometryTransport}
      */
    setParams(params: Record<string, unknown>): GeometryTransport {
        setParams(this.main.params, params);
        return this;
    }

    /**
     * Set the {@link BufferGeometry} and geometry type that can be used when a mesh is created.
     *
     * @param {BufferGeometry} geometry
     * @param {number} geometryType [0=Mesh|1=LineSegments|2=Points]
     * @return {GeometryTransport}
     */
    setGeometry(geometry: BufferGeometry | Record<string, never>, geometryType: 0 | 1 | 2) {
        this.main.geometry = geometry;
        this.main.geometryType = geometryType;
        if (geometry instanceof BufferGeometry) this.main.bufferGeometry = geometry;
        return this;
    }

    /**
     * Returns the {@link BufferGeometry}.
     * @return {BufferGeometry|null}
     */
    getBufferGeometry() {
        return this.main.bufferGeometry;
    }

    /**
     * @param {boolean} cloneBuffers
     * @return {GeometryTransport}
     */
    package(cloneBuffers: boolean): GeometryTransport {
        packageBuffer(cloneBuffers, this.main.buffers, this.transferables, this.main.geometry);
        return this;
    }

    /**
     * @param {boolean} cloneBuffers
     * @return {GeometryTransport}
     */
    reconstruct(cloneBuffers: boolean): GeometryTransport {
        reconstructBuffer(cloneBuffers, this.main.bufferGeometry, this.main.geometry);
        return this;
    }

}

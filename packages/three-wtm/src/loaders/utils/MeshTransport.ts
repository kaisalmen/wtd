import { Box3, BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Mesh, Sphere } from 'three';
import { buildDataTransport, DataTransportDef, setParams } from './DataTransport';
import { MaterialsTransport } from './MaterialsTransport';

export type MeshTransportDef = DataTransportDef & {
    // 0: mesh, 1: line, 2: point
    geometryType: 0 | 1 | 2;
    geometry: BufferGeometry | Record<string, never>;
    bufferGeometry: BufferGeometry | undefined;
    meshName: string | undefined;
    materialsTransport: MaterialsTransport;
};

export function buildGeometryTransport(cmd?: string, id?: number): MeshTransportDef {
    const meshTransportDef = buildDataTransport('MeshTransport', cmd, id) as MeshTransportDef;
    meshTransportDef.geometryType = 0;
    meshTransportDef.geometry = {};
    meshTransportDef.bufferGeometry = undefined;
    meshTransportDef.meshName = undefined;
    meshTransportDef.materialsTransport = new MaterialsTransport();
    return meshTransportDef;
}

/**
 * Define a structure that is used to send mesh data between main and workers.
 */
export class MeshTransport {

    private main: MeshTransportDef;

    /**
     * Creates a new {@link MeshTransport}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.main = buildGeometryTransport(cmd, id);
    }

    /**
     * @param {MeshTransportDef} transportObject
     * @return {MeshTransport}
     */
    loadData(transportObject: MeshTransportDef) {
        this.main = buildGeometryTransport(transportObject.cmd, transportObject.id);
        this.main.meshName = transportObject.meshName;
        if (transportObject.materialsTransport) {
            this.main.materialsTransport = new MaterialsTransport().loadData(transportObject.materialsTransport.getMaterialsTransportDef());
        }
        return this;
    }

    /**
     * @param {Record<string, unknown>} params
     * @return {MeshTransport}
     */
    setParams(params: Record<string, unknown>): MeshTransport {
        setParams(this.main.params, params);
        return this;
    }

    /**
     * Returns the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @return {number}
     */
    getGeometryType() {
        return this.main.geometryType;
    }

    /**
     * The {@link MaterialsTransport} wraps all info regarding the material for the mesh.
     * @param {MaterialsTransport} materialsTransport
     * @return {MeshTransport}
     */
    setMaterialsTransport(materialsTransport: MaterialsTransport) {
        this.main.materialsTransport = materialsTransport;
        return this;
    }

    /**
     * @return {MaterialsTransport}
     */
    getMaterialsTransport(): MaterialsTransport {
        return this.main.materialsTransport;
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
     * Sets the mesh and the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @param {Mesh} mesh
     * @param {number} geometryType
     * @return {MeshTransport}
     */
    setMesh(mesh: Mesh, geometryType: 0 | 1 | 2) {
        this.main.meshName = mesh.name;
        this.setGeometry(mesh.geometry, geometryType);
        return this;
    }

    /**
     * Package {@link BufferGeometry} and prepare it for transport.
     *
     * @param {boolean} cloneBuffers Clone buffers if their content shall stay in the current context.
     */
    private packageBuffer(cloneBuffers: boolean, buffers: Map<string, ArrayBuffer>,
        geometry: BufferGeometry | Record<string, never>) {

        // fast-fail
        if (!(geometry instanceof BufferGeometry)) return;

        const vertexBA = geometry.getAttribute('position');
        const normalBA = geometry.getAttribute('normal');
        const uvBA = geometry.getAttribute('uv');
        const colorBA = geometry.getAttribute('color');
        const skinIndexBA = geometry.getAttribute('skinIndex');
        const skinWeightBA = geometry.getAttribute('skinWeight');
        const indexBA = geometry.getIndex();

        this.addBufferAttributeToTransferable('position', vertexBA, cloneBuffers, buffers);
        this.addBufferAttributeToTransferable('normal', normalBA, cloneBuffers, buffers);
        this.addBufferAttributeToTransferable('uv', uvBA, cloneBuffers, buffers);
        this.addBufferAttributeToTransferable('color', colorBA, cloneBuffers, buffers);
        this.addBufferAttributeToTransferable('skinIndex', skinIndexBA, cloneBuffers, buffers);
        this.addBufferAttributeToTransferable('skinWeight', skinWeightBA, cloneBuffers, buffers);
        this.addBufferAttributeToTransferable('index', indexBA, cloneBuffers, buffers);
    }

    /**
     * Reconstructs the {@link BufferGeometry} from the raw buffers.
     * @param {boolean} cloneBuffers
     * @return {GeometryTransport}
     */
    private reconstructBuffer(cloneBuffers: boolean, bufferGeometry: BufferGeometry | undefined,
        transferredGeometry: BufferGeometry | Record<string, never>) {

        // fast-fail: We already have a bufferGeometry
        if (bufferGeometry instanceof BufferGeometry) return;

        bufferGeometry = new BufferGeometry();
        this.assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.position, 'position', cloneBuffers);
        this.assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.normal, 'normal', cloneBuffers);
        this.assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.uv, 'uv', cloneBuffers);
        this.assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.color, 'color', cloneBuffers);
        this.assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.skinIndex, 'skinIndex', cloneBuffers);
        this.assignAttributeFromTransferable(bufferGeometry, transferredGeometry.attributes.skinWeight, 'skinWeight', cloneBuffers);

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

    private addBufferAttributeToTransferable(name: string, input: BufferAttribute | InterleavedBufferAttribute | null | undefined,
        cloneBuffer: boolean, buffers: Map<string, ArrayBuffer>): void {
        if (input && input !== null) {
            const arrayLike = (cloneBuffer ? Array.from(input.array).slice(0) : input.array) as Uint8Array;
            buffers.set(name, arrayLike);
        }
    }

    private assignAttributeFromTransferable(bufferGeometry: BufferGeometry, attr: BufferAttribute | InterleavedBufferAttribute,
        attrName: string, cloneBuffer: boolean): void {
        if (bufferGeometry instanceof BufferAttribute) {
            const arrayLike = (cloneBuffer ? Array.from(attr.array).slice(0) : attr.array) as number[];
            bufferGeometry.setAttribute(attrName, new BufferAttribute(arrayLike, attr.itemSize, attr.normalized));
        }
    }

    /**
     * @param {boolean} cloneBuffers
     * @return {MeshTransport}
     */
    package(cloneBuffers: boolean): MeshTransport {
        this.packageBuffer(cloneBuffers, this.main.buffers, this.main.geometry);
        if (this.main.materialsTransport !== null) this.main.materialsTransport.package(cloneBuffers);
        return this;
    }

    /**
     * @param {boolean} cloneBuffers
     * @return {MeshTransport}
     */
    reconstruct(cloneBuffers: boolean): MeshTransport {
        this.reconstructBuffer(cloneBuffers, this.main.bufferGeometry, this.main.geometry);
        // so far nothing needs to be done for material
        return this;
    }

    getData(): { main: MeshTransportDef, transferables: Transferable[] } {
        const trans: Transferable[] = [];
        for (const buf of this.main.buffers.values()) {
            trans.push((buf as Uint8Array).buffer);
        }
        return {
            main: this.main,
            transferables: trans
        };
    }

}

import { Box3, BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Mesh, Sphere } from 'three';
import { PayloadType } from '../workerTaskManager/WorkerTaskManager';
import { DataTransportPayload } from './DataTransport';
import { MaterialsTransport, MaterialsTransportPayload } from './MaterialsTransport';

export type MeshTransportPayloadType = PayloadType & {
    geometryType: 0 | 1 | 2;
    bufferGeometry: BufferGeometry | Record<string, unknown> | undefined;
    meshName: string | undefined;
    materialsTransportPayload: MaterialsTransportPayload | undefined;
};

export class MeshTransportPayload extends DataTransportPayload implements MeshTransportPayloadType {

    type = 'MeshTransportPayload';
    // 0: mesh, 1: line, 2: point
    geometryType: 0 | 1 | 2 = 0;
    bufferGeometry: BufferGeometry | Record<string, unknown> | undefined;
    meshName: string | undefined;
    materialsTransportPayload: MaterialsTransportPayload = new MaterialsTransportPayload();

    constructor(cmd?: string, id?: number) {
        super(cmd, id);
    }

    getGeometryType() {
        return this.geometryType;
    }

    setMaterialsTransportPayload(materialsTransportPayload: MaterialsTransportPayload) {
        this.materialsTransportPayload = materialsTransportPayload;
    }

    getMaterialsTransport() {
        return this.materialsTransportPayload;
    }
}

/**
 * Define a structure that is used to send mesh data between main and workers.
 */
export class MeshTransport {

    private payload: MeshTransportPayload;

    /**
     * Creates a new {@link MeshTransport}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.payload = new MeshTransportPayload(cmd, id);
    }

    /**
     * The {@link MaterialsTransport} wraps all info regarding the material for the mesh.
     * @param {MaterialsTransportPayload} materialsTransportPayload
     */
    setMaterialsTransport(materialsTransportPayload: MaterialsTransportPayload) {
        this.payload.setMaterialsTransportPayload(materialsTransportPayload);
    }

    /**
     * Set the {@link BufferGeometry} and geometry type that can be used when a mesh is created.
     *
     * @param {BufferGeometry} bufferGeometry
     * @param {number} geometryType [0=Mesh|1=LineSegments|2=Points]
     */
    setBufferGeometry(bufferGeometry: BufferGeometry | undefined, geometryType: 0 | 1 | 2) {
        this.payload.bufferGeometry = bufferGeometry;
        this.payload.geometryType = geometryType;
    }

    /**
     * Returns the {@link BufferGeometry}.
     * @return {BufferGeometry | Record<string, unknown> | undefined}
     */
    getBufferGeometry() {
        return this.payload.bufferGeometry;
    }

    /**
     * Sets the mesh and the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @param {Mesh} mesh
     * @param {number} geometryType
     */
    setMesh(mesh: Mesh, geometryType: 0 | 1 | 2) {
        this.payload.meshName = mesh.name;
        this.setBufferGeometry(mesh.geometry, geometryType);
    }

    /**
     * @param {MeshTransportPayload} transportObject
     */
    loadData(transportObject: MeshTransportPayload, cloneBuffers: boolean): void {
        this.payload = Object.assign(new MeshTransportPayload(), transportObject);
        this.payload.bufferGeometry = MeshTransport.reconstructBuffer(cloneBuffers, this.payload.bufferGeometry as Record<string, unknown>);

        if (transportObject.materialsTransportPayload) {
            this.payload.materialsTransportPayload = new MaterialsTransport().loadData(transportObject.materialsTransportPayload);
        }
    }

    /**
     * @param {boolean} cloneBuffers
     */
    package(cloneBuffers: boolean): { payload: MeshTransportPayload, transferables: Transferable[] } {
        MeshTransport.packageBuffer(cloneBuffers, this.payload.bufferGeometry as BufferGeometry, this.payload.buffers);

        const transferables: Transferable[] = [];
        this.payload.fillTransferables(this.payload.buffers.values(), transferables, cloneBuffers);

        if (this.payload.materialsTransportPayload) this.payload.materialsTransportPayload.package(cloneBuffers);
        return {
            payload: this.payload,
            transferables: transferables
        };
    }

    /**
     * Package {@link BufferGeometry} and prepare it for transport.
     *
     * @param {boolean} cloneBuffers Clone buffers if their content shall stay in the current context.
     */
    static packageBuffer(cloneBuffers: boolean, bufferGeometry: BufferGeometry | undefined, buffers: Map<string, ArrayBuffer>) {
        // fast-fail
        if (!(bufferGeometry instanceof BufferGeometry)) return;

        const vertexBA = bufferGeometry.getAttribute('position');
        const normalBA = bufferGeometry.getAttribute('normal');
        const uvBA = bufferGeometry.getAttribute('uv');
        const colorBA = bufferGeometry.getAttribute('color');
        const skinIndexBA = bufferGeometry.getAttribute('skinIndex');
        const skinWeightBA = bufferGeometry.getAttribute('skinWeight');
        const indexBA = bufferGeometry.getIndex();

        MeshTransport.addAttributeToBuffers('position', vertexBA, cloneBuffers, buffers);
        MeshTransport.addAttributeToBuffers('normal', normalBA, cloneBuffers, buffers);
        MeshTransport.addAttributeToBuffers('uv', uvBA, cloneBuffers, buffers);
        MeshTransport.addAttributeToBuffers('color', colorBA, cloneBuffers, buffers);
        MeshTransport.addAttributeToBuffers('skinIndex', skinIndexBA, cloneBuffers, buffers);
        MeshTransport.addAttributeToBuffers('skinWeight', skinWeightBA, cloneBuffers, buffers);
        MeshTransport.addAttributeToBuffers('index', indexBA, cloneBuffers, buffers);
    }

    /**
     * Reconstructs the {@link BufferGeometry} from the raw buffers.
     * @param {boolean} cloneBuffers
     */
    static reconstructBuffer(cloneBuffers: boolean, transferredGeometry: BufferGeometry | Record<string, unknown>): BufferGeometry {
        // fast-fail: We already have a bufferGeometry
        if (transferredGeometry instanceof BufferGeometry) return transferredGeometry;

        const bufferGeometry = new BufferGeometry();
        if (transferredGeometry.attributes) {
            const attr = transferredGeometry.attributes as Record<string, BufferAttribute | InterleavedBufferAttribute>;
            MeshTransport.assignAttributeFromTransfered(bufferGeometry, attr.position, 'position', cloneBuffers);
            MeshTransport.assignAttributeFromTransfered(bufferGeometry, attr.normal, 'normal', cloneBuffers);
            MeshTransport.assignAttributeFromTransfered(bufferGeometry, attr.uv, 'uv', cloneBuffers);
            MeshTransport.assignAttributeFromTransfered(bufferGeometry, attr.color, 'color', cloneBuffers);
            MeshTransport.assignAttributeFromTransfered(bufferGeometry, attr.skinIndex, 'skinIndex', cloneBuffers);
            MeshTransport.assignAttributeFromTransfered(bufferGeometry, attr.skinWeight, 'skinWeight', cloneBuffers);
        }

        // TODO: morphAttributes

        if (transferredGeometry.index !== null) {
            const indexAttr = transferredGeometry.index as BufferAttribute;
            const indexBuffer = cloneBuffers ? Array.from(indexAttr.array).slice(0) : indexAttr.array;
            bufferGeometry.setIndex(new BufferAttribute(indexBuffer, indexAttr.itemSize, indexAttr.normalized));
        }

        const boundingBox = transferredGeometry.boundingBox;
        if (boundingBox !== null) {
            bufferGeometry.boundingBox = Object.assign(new Box3(), boundingBox);
        }

        const boundingSphere = transferredGeometry.boundingSphere;
        if (boundingSphere !== null) {
            bufferGeometry.boundingSphere = Object.assign(new Sphere(), boundingSphere);
        }

        bufferGeometry.uuid = transferredGeometry.uuid as string;
        bufferGeometry.name = transferredGeometry.name as string;
        bufferGeometry.type = transferredGeometry.type as string;
        bufferGeometry.groups = transferredGeometry.groups as Array<{ start: number; count: number; materialIndex?: number | undefined }>;
        bufferGeometry.drawRange = transferredGeometry.drawRange as { start: number; count: number };
        bufferGeometry.userData = transferredGeometry.userData as Record<string, unknown>;
        return bufferGeometry;
    }

    static addAttributeToBuffers(name: string, input: BufferAttribute | InterleavedBufferAttribute | null | undefined,
        cloneBuffer: boolean, buffers: Map<string, ArrayBuffer>): void {
        if (input && input !== null) {
            const arrayLike = (cloneBuffer ? Array.from(input.array).slice(0) : input.array) as Uint8Array;
            buffers.set(name, arrayLike);
        }
    }

    static assignAttributeFromTransfered(bufferGeometry: BufferGeometry, attr: BufferAttribute | InterleavedBufferAttribute | undefined,
        attrName: string, cloneBuffer: boolean): void {
        if (attr) {
            const arrayLike = (cloneBuffer ? Array.from(attr.array).slice(0) : attr.array) as number[];
            bufferGeometry.setAttribute(attrName, new BufferAttribute(arrayLike, attr.itemSize, attr.normalized));
        }
    }

}

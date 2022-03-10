import { Box3, BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Mesh, Sphere } from 'three';
import { PayloadType } from '../workerTaskManager/WorkerTaskManager';
import { DataTransportPayload, DataTransportPayloadUtils } from './DataTransport';
import { MaterialsTransportPayload, MaterialsTransportPayloadUtils } from './MaterialsTransport';

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

}

export class MeshTransportPayloadUtils {

    /**
     * Set the {@link BufferGeometry} and geometry type that can be used when a mesh is created.
     *
     * @param {BufferGeometry} bufferGeometry
     * @param {number} geometryType [0=Mesh|1=LineSegments|2=Points]
     */
    static setBufferGeometry(payload: MeshTransportPayload, bufferGeometry: BufferGeometry | undefined, geometryType: 0 | 1 | 2) {
        payload.bufferGeometry = bufferGeometry;
        payload.geometryType = geometryType;
    }

    /**
     * Sets the mesh and the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @param {Mesh} mesh
     * @param {number} geometryType
     */
    static setMesh(payload: MeshTransportPayload, mesh: Mesh, geometryType: 0 | 1 | 2) {
        payload.meshName = mesh.name;
        MeshTransportPayloadUtils.setBufferGeometry(payload, mesh.geometry, geometryType);
    }

    /**
     * @param {boolean} cloneBuffers
     */
    static packMeshTransportPayload(payload: MeshTransportPayload, cloneBuffers: boolean): { payload: MeshTransportPayload, transferables: Transferable[] } {
        MeshTransportPayloadUtils.packGeometryBuffers(cloneBuffers, payload.bufferGeometry as BufferGeometry, payload.buffers);

        const transferables: Transferable[] = [];
        DataTransportPayloadUtils.fillTransferables(payload.buffers.values(), transferables, cloneBuffers);

        if (payload.materialsTransportPayload) {
            MaterialsTransportPayloadUtils.packMaterialsTransportPayload(payload.materialsTransportPayload, cloneBuffers);
        }
        return {
            payload: payload,
            transferables: transferables
        };
    }

    /**
     * Package {@link BufferGeometry} and prepare it for transport.
     *
     * @param {boolean} cloneBuffers Clone buffers if their content shall stay in the current context.
     */
    static packGeometryBuffers(cloneBuffers: boolean, bufferGeometry: BufferGeometry | undefined, buffers: Map<string, ArrayBuffer>) {
        // fast-fail
        if (!(bufferGeometry instanceof BufferGeometry)) return;

        const vertexBA = bufferGeometry.getAttribute('position');
        const normalBA = bufferGeometry.getAttribute('normal');
        const uvBA = bufferGeometry.getAttribute('uv');
        const colorBA = bufferGeometry.getAttribute('color');
        const skinIndexBA = bufferGeometry.getAttribute('skinIndex');
        const skinWeightBA = bufferGeometry.getAttribute('skinWeight');
        const indexBA = bufferGeometry.getIndex();

        MeshTransportPayloadUtils.addAttributeToBuffers('position', vertexBA, cloneBuffers, buffers);
        MeshTransportPayloadUtils.addAttributeToBuffers('normal', normalBA, cloneBuffers, buffers);
        MeshTransportPayloadUtils.addAttributeToBuffers('uv', uvBA, cloneBuffers, buffers);
        MeshTransportPayloadUtils.addAttributeToBuffers('color', colorBA, cloneBuffers, buffers);
        MeshTransportPayloadUtils.addAttributeToBuffers('skinIndex', skinIndexBA, cloneBuffers, buffers);
        MeshTransportPayloadUtils.addAttributeToBuffers('skinWeight', skinWeightBA, cloneBuffers, buffers);
        MeshTransportPayloadUtils.addAttributeToBuffers('index', indexBA, cloneBuffers, buffers);
    }

    static addAttributeToBuffers(name: string, input: BufferAttribute | InterleavedBufferAttribute | null | undefined,
        cloneBuffer: boolean, buffers: Map<string, ArrayBuffer>): void {
        if (input && input !== null) {
            const arrayLike = (cloneBuffer ? Array.from(input.array).slice(0) : input.array) as Uint8Array;
            buffers.set(name, arrayLike);
        }
    }

    static unpackMeshTransportPayload(payload: MeshTransportPayloadType, cloneBuffers: boolean): MeshTransportPayload {
        const mtp = Object.assign(new MeshTransportPayload(payload.cmd, payload.id), payload);
        mtp.bufferGeometry = MeshTransportPayloadUtils.reconstructBuffer(cloneBuffers, mtp.bufferGeometry as Record<string, unknown>);

        if (payload.materialsTransportPayload) {
            mtp.materialsTransportPayload = Object.assign(new MaterialsTransportPayload(), payload.materialsTransportPayload);
            MaterialsTransportPayloadUtils.unpackMaterialsTransportPayload(mtp.materialsTransportPayload, payload.materialsTransportPayload);
        }
        return mtp;
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
            MeshTransportPayloadUtils.assignAttributeFromTransfered(bufferGeometry, attr.position, 'position', cloneBuffers);
            MeshTransportPayloadUtils.assignAttributeFromTransfered(bufferGeometry, attr.normal, 'normal', cloneBuffers);
            MeshTransportPayloadUtils.assignAttributeFromTransfered(bufferGeometry, attr.uv, 'uv', cloneBuffers);
            MeshTransportPayloadUtils.assignAttributeFromTransfered(bufferGeometry, attr.color, 'color', cloneBuffers);
            MeshTransportPayloadUtils.assignAttributeFromTransfered(bufferGeometry, attr.skinIndex, 'skinIndex', cloneBuffers);
            MeshTransportPayloadUtils.assignAttributeFromTransfered(bufferGeometry, attr.skinWeight, 'skinWeight', cloneBuffers);
        }

        // TODO: morphAttributes

        if (transferredGeometry.index !== null) {
            const indexAttr = transferredGeometry.index as BufferAttribute;
            if (indexAttr) {
                const indexBuffer = cloneBuffers ? Array.from(indexAttr.array).slice(0) : indexAttr.array;
                bufferGeometry.setIndex(new BufferAttribute(indexBuffer, indexAttr.itemSize, indexAttr.normalized));
            }
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

    static assignAttributeFromTransfered(bufferGeometry: BufferGeometry, attr: BufferAttribute | InterleavedBufferAttribute | undefined,
        attrName: string, cloneBuffer: boolean): void {
        if (attr) {
            const arrayLike = (cloneBuffer ? Array.from(attr.array).slice(0) : attr.array) as number[];
            bufferGeometry.setAttribute(attrName, new BufferAttribute(arrayLike, attr.itemSize, attr.normalized));
        }
    }
}

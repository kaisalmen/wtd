import {
    DataPayloadHandler,
    DataPayload,
    DataPayloadType,
    PayloadHandler,
    PayloadRegister
} from 'wtd-core';
import {
    Box3,
    BufferAttribute,
    BufferGeometry,
    InterleavedBufferAttribute,
    Mesh,
    Sphere
} from 'three';

export type MeshPayloadType = DataPayloadType & {
    geometryType: 0 | 1 | 2;
    bufferGeometry: BufferGeometry | Record<string, unknown> | undefined;
    meshName: string | undefined;
};

export class MeshPayload extends DataPayload implements MeshPayloadType {

    static TYPE = 'MeshPayload';
    type = MeshPayload.TYPE;
    // 0: mesh, 1: line, 2: point
    geometryType: 0 | 1 | 2 = 0;
    bufferGeometry: BufferGeometry | Record<string, unknown> | undefined;
    meshName: string | undefined;

    /**
     * Set the {@link BufferGeometry} and geometry type that can be used when a mesh is created.
     *
     * @param {BufferGeometry} bufferGeometry
     * @param {number} geometryType [0=Mesh|1=LineSegments|2=Points]
     */
    setBufferGeometry(bufferGeometry: BufferGeometry | undefined, geometryType: 0 | 1 | 2) {
        this.bufferGeometry = bufferGeometry;
        this.geometryType = geometryType;
    }

    /**
     * Sets the mesh and the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @param {Mesh} mesh
     * @param {number} geometryType
     */
    setMesh(mesh: Mesh, geometryType: 0 | 1 | 2) {
        this.meshName = mesh.name;
        this.setBufferGeometry(mesh.geometry, geometryType);
    }

}

export class MeshPayloadHandler implements PayloadHandler {

    static pack(payload: MeshPayload, transferables: Transferable[], cloneBuffers: boolean) {
        const handler = PayloadRegister.handler.get(MeshPayload.TYPE);
        return handler ? handler.pack(payload, transferables, cloneBuffers) : undefined;
    }

    /**
     * @param {boolean} cloneBuffers
     */
    pack(payload: MeshPayload, transferables: Transferable[], cloneBuffers: boolean) {
        MeshPayloadHandler.packGeometryBuffers(cloneBuffers, payload.bufferGeometry as BufferGeometry, payload.buffers);
        DataPayloadHandler.fillTransferables(payload.buffers.values(), transferables, cloneBuffers);
        return transferables;
    }

    static unpack(transportObject: MeshPayloadType, cloneBuffers: boolean) {
        const handler = PayloadRegister.handler.get(MeshPayload.TYPE);
        return handler ? handler.unpack(transportObject, cloneBuffers) : undefined;
    }

    unpack(transportObject: MeshPayloadType, cloneBuffers: boolean) {
        const meshPayload = Object.assign(new MeshPayload(), transportObject);
        meshPayload.bufferGeometry = MeshPayloadHandler.reconstructBuffer(cloneBuffers, meshPayload.bufferGeometry as Record<string, unknown>);
        return meshPayload;
    }

    static packGeometryBuffers(cloneBuffers: boolean, bufferGeometry: BufferGeometry | undefined, buffers: Map<string, ArrayBufferLike>) {
        // fast-fail
        if (!(bufferGeometry instanceof BufferGeometry)) return;

        const vertexBA = bufferGeometry.getAttribute('position');
        const normalBA = bufferGeometry.getAttribute('normal');
        const uvBA = bufferGeometry.getAttribute('uv');
        const colorBA = bufferGeometry.getAttribute('color');
        const skinIndexBA = bufferGeometry.getAttribute('skinIndex');
        const skinWeightBA = bufferGeometry.getAttribute('skinWeight');
        const indexBA = bufferGeometry.getIndex();

        MeshPayloadHandler.addAttributeToBuffers('position', vertexBA, cloneBuffers, buffers);
        MeshPayloadHandler.addAttributeToBuffers('normal', normalBA, cloneBuffers, buffers);
        MeshPayloadHandler.addAttributeToBuffers('uv', uvBA, cloneBuffers, buffers);
        MeshPayloadHandler.addAttributeToBuffers('color', colorBA, cloneBuffers, buffers);
        MeshPayloadHandler.addAttributeToBuffers('skinIndex', skinIndexBA, cloneBuffers, buffers);
        MeshPayloadHandler.addAttributeToBuffers('skinWeight', skinWeightBA, cloneBuffers, buffers);
        MeshPayloadHandler.addAttributeToBuffers('index', indexBA, cloneBuffers, buffers);
    }

    static addAttributeToBuffers(name: string, input: BufferAttribute | InterleavedBufferAttribute | null | undefined,
        cloneBuffer: boolean, buffers: Map<string, ArrayBufferLike>): void {
        if (input && input !== null) {
            const typedArray = input.array as unknown as ArrayBufferLike;
            buffers.set(name, cloneBuffer ? typedArray.slice(0) : typedArray);
        }
    }

    static reconstructBuffer(cloneBuffers: boolean, transferredGeometry: BufferGeometry | Record<string, unknown>): BufferGeometry {
        const bufferGeometry = new BufferGeometry();

        // fast-fail: transferredGeometry is either rubbish or already a bufferGeometry
        if (!transferredGeometry) {
            return bufferGeometry;
        }
        else if (transferredGeometry instanceof BufferGeometry) {
            return transferredGeometry;
        }

        if (transferredGeometry.attributes) {
            const attr = transferredGeometry.attributes as Record<string, BufferAttribute | InterleavedBufferAttribute>;
            MeshPayloadHandler.assignAttributeFromTransfered(bufferGeometry, attr.position, 'position', cloneBuffers);
            MeshPayloadHandler.assignAttributeFromTransfered(bufferGeometry, attr.normal, 'normal', cloneBuffers);
            MeshPayloadHandler.assignAttributeFromTransfered(bufferGeometry, attr.uv, 'uv', cloneBuffers);
            MeshPayloadHandler.assignAttributeFromTransfered(bufferGeometry, attr.color, 'color', cloneBuffers);
            MeshPayloadHandler.assignAttributeFromTransfered(bufferGeometry, attr.skinIndex, 'skinIndex', cloneBuffers);
            MeshPayloadHandler.assignAttributeFromTransfered(bufferGeometry, attr.skinWeight, 'skinWeight', cloneBuffers);
        }

        // TODO: morphAttributes

        if (transferredGeometry.index !== null) {
            const indexAttr = transferredGeometry.index as BufferAttribute;
            if (indexAttr) {
                const indexBuffer = cloneBuffers ? (indexAttr.array as number[]).slice(0) : indexAttr.array;
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

    static assignAttributeFromTransfered(bufferGeometry: BufferGeometry, input: BufferAttribute | InterleavedBufferAttribute | undefined,
        attrName: string, cloneBuffer: boolean): void {
        if (input) {
            const arrayLike = cloneBuffer ? (input.array as number[]).slice(0) : input.array;
            bufferGeometry.setAttribute(attrName, new BufferAttribute(arrayLike, input.itemSize, input.normalized));
        }
    }
}

// register the Mesh related payload handler
PayloadRegister.handler.set(MeshPayload.TYPE, new MeshPayloadHandler());

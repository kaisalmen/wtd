import type {
    AssociatedArrayType,
    ParameterizedMessage,
    Payload,
    PayloadHandler
} from 'wtd-core';
import {
    PayloadRegister,
    fillTransferables
} from 'wtd-core';
import {
    Box3,
    BufferAttribute,
    BufferGeometry,
    InterleavedBufferAttribute,
    Mesh,
    Sphere
} from 'three';

export type AssociatedBufferAttributeArrayType = { [key: string]: BufferAttribute | InterleavedBufferAttribute }

export type MeshPayloadAdditions = Payload & {
    message: MeshPayloadMessageAdditions
}

export type MeshPayloadMessageAdditions = ParameterizedMessage & {
    geometryType: GeometryType;
    bufferGeometry: BufferGeometry | AssociatedArrayType<unknown> | undefined;
    meshName: string;
}

export enum GeometryType {
    MESH = 0,
    LINE = 1,
    POINT = 2
}

export class MeshPayload implements MeshPayloadAdditions {

    $type = 'MeshPayload';
    message: MeshPayloadMessageAdditions = {
        params: {},
        buffers: new Map(),
        geometryType: GeometryType.MESH,
        bufferGeometry: new BufferGeometry(),
        meshName: ''
    };

    /**
     * Set the {@link BufferGeometry} and geometry type that can be used when a mesh is created.
     *
     * @param {BufferGeometry} bufferGeometry
     * @param {number} geometryType [0=Mesh|1=LineSegments|2=Points]
     */
    setBufferGeometry(bufferGeometry: BufferGeometry, geometryType: GeometryType) {
        this.message.bufferGeometry = bufferGeometry;
        this.message.geometryType = geometryType;
    }

    /**
     * Sets the mesh and the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @param {Mesh} mesh
     * @param {number} geometryType
     */
    setMesh(mesh: Mesh, geometryType: GeometryType) {
        this.message.meshName = mesh.name;
        this.setBufferGeometry(mesh.geometry, geometryType);
    }

}

export class MeshPayloadHandler implements PayloadHandler {

    pack(payload: Payload, transferables: Transferable[], cloneBuffers: boolean) {
        const mp = payload as MeshPayload;
        if (mp.message.buffers) {
            packGeometryBuffers(cloneBuffers, mp.message.bufferGeometry as BufferGeometry, mp.message.buffers);
            fillTransferables(mp.message.buffers.values(), transferables, cloneBuffers);
        }
        return transferables;
    }

    unpack(transportObject: Payload, cloneBuffers: boolean) {
        const mp = transportObject as MeshPayload;
        const meshPayload = Object.assign(new MeshPayload(), mp);
        if (meshPayload.message.bufferGeometry) {
            meshPayload.message.bufferGeometry = reconstructBuffer(cloneBuffers, meshPayload.message.bufferGeometry);
        }
        return meshPayload;
    }
}

export const packGeometryBuffers = (cloneBuffers: boolean, bufferGeometry: BufferGeometry | undefined, buffers: Map<string, ArrayBufferLike>) => {
    // fast-fail
    if (!(bufferGeometry instanceof BufferGeometry)) return;

    const vertexBA = bufferGeometry.getAttribute('position');
    const normalBA = bufferGeometry.getAttribute('normal');
    const uvBA = bufferGeometry.getAttribute('uv');
    const colorBA = bufferGeometry.getAttribute('color');
    const skinIndexBA = bufferGeometry.getAttribute('skinIndex');
    const skinWeightBA = bufferGeometry.getAttribute('skinWeight');
    const indexBA = bufferGeometry.getIndex();

    addAttributeToBuffers('position', vertexBA, cloneBuffers, buffers);
    addAttributeToBuffers('normal', normalBA, cloneBuffers, buffers);
    addAttributeToBuffers('uv', uvBA, cloneBuffers, buffers);
    addAttributeToBuffers('color', colorBA, cloneBuffers, buffers);
    addAttributeToBuffers('skinIndex', skinIndexBA, cloneBuffers, buffers);
    addAttributeToBuffers('skinWeight', skinWeightBA, cloneBuffers, buffers);
    addAttributeToBuffers('index', indexBA, cloneBuffers, buffers);
};

export const addAttributeToBuffers = (name: string, input: BufferAttribute | InterleavedBufferAttribute | null | undefined,
    cloneBuffer: boolean, buffers: Map<string, ArrayBufferLike>): void => {
    if (input && input !== null) {
        const typedArray = input.array as unknown as ArrayBufferLike;
        buffers.set(name, cloneBuffer ? typedArray.slice(0) : typedArray);
    }
};

export const reconstructBuffer = (cloneBuffers: boolean, transferredGeometry: BufferGeometry | AssociatedArrayType<unknown>): BufferGeometry => {
    const bufferGeometry = new BufferGeometry();

    // fast-fail: transferredGeometry is either rubbish or already a bufferGeometry
    if (!transferredGeometry) {
        return bufferGeometry;
    }
    else if (transferredGeometry instanceof BufferGeometry) {
        return transferredGeometry;
    }

    if (transferredGeometry.attributes) {
        const attr = transferredGeometry.attributes as AssociatedBufferAttributeArrayType;
        assignAttributeFromTransfered(bufferGeometry, attr.position, 'position', cloneBuffers);
        assignAttributeFromTransfered(bufferGeometry, attr.normal, 'normal', cloneBuffers);
        assignAttributeFromTransfered(bufferGeometry, attr.uv, 'uv', cloneBuffers);
        assignAttributeFromTransfered(bufferGeometry, attr.color, 'color', cloneBuffers);
        assignAttributeFromTransfered(bufferGeometry, attr.skinIndex, 'skinIndex', cloneBuffers);
        assignAttributeFromTransfered(bufferGeometry, attr.skinWeight, 'skinWeight', cloneBuffers);
    }

    // TODO: morphAttributes

    if (transferredGeometry.index !== null) {
        const indexAttr = transferredGeometry.index as BufferAttribute;
        if (indexAttr) {
            const indexBuffer = cloneBuffers ? indexAttr.array.slice(0) : indexAttr.array;
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
    bufferGeometry.groups = transferredGeometry.groups as Array<{ start: number; count: number; materialIndex?: number | undefined }>;
    bufferGeometry.drawRange = transferredGeometry.drawRange as { start: number; count: number };
    bufferGeometry.userData = transferredGeometry.userData as AssociatedArrayType<unknown>;
    return bufferGeometry;
};

export const assignAttributeFromTransfered = (bufferGeometry: BufferGeometry, input: BufferAttribute | InterleavedBufferAttribute | undefined,
    attrName: string, cloneBuffer: boolean): void => {
    if (input) {
        const arrayLike = cloneBuffer ? input.array.slice(0) : input.array;
        bufferGeometry.setAttribute(attrName, new BufferAttribute(arrayLike, input.itemSize, input.normalized));
    }
};

// register the Mesh related payload handler
PayloadRegister.handler.set('MeshPayload', new MeshPayloadHandler());

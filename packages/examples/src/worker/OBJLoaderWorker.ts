import { Mesh, Material } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    DataTransportPayload,
    DataTransportPayloadUtils
} from 'wtd-core';
import {
    MaterialUtils,
    MeshTransportPayload,
    MaterialsTransportPayload,
    MaterialsTransportPayloadUtils,
    MeshTransportPayloadUtils,
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class OBJLoaderWorker extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    private localData = {
        objLoader: undefined as OBJLoader | undefined,
        materials: new Map() as Map<string, Material>,
        buffer: undefined as ArrayBufferLike | undefined,
        objectId: 0
    };

    init(payload: DataTransportPayload) {
        console.log(`OBJLoaderWorker#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        if (payload.type === 'MaterialsTransportPayload') {
            this.localData.buffer = payload.buffers?.get('modelData');

            const materialsTransportPayload = Object.assign(new MaterialsTransportPayload({}), payload as MaterialsTransportPayload);
            MaterialsTransportPayloadUtils.unpackMaterialsTransportPayload(materialsTransportPayload, payload as MaterialsTransportPayload, true);
            this.localData.materials = materialsTransportPayload.materials;

            payload.cmd = 'initComplete';
            self.postMessage(payload);
        }
    }

    execute(payload: DataTransportPayload) {
        console.log(`OBJLoaderWorker#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);

        if (payload.type === 'DataTransportPayload') {
            this.localData.objLoader = new OBJLoader();
            this.localData.objectId = payload.params?.objectId as number;

            const materials: Record<string, unknown> = {};
            materials.create = (name: string) => {
                return materials[name];
            };
            for (const [k, v] of Object.entries(this.localData.materials)) {
                materials[k] = v;
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.localData.objLoader.setMaterials(materials as unknown);

            const enc = new TextDecoder('utf-8');
            const meshes = this.localData.objLoader.parse(enc.decode(this.localData.buffer));
            for (let mesh, i = 0; i < meshes.children.length; i++) {
                mesh = meshes.children[i] as Mesh;
                mesh.name = mesh.name + payload.id;

                const materialTP = new MaterialsTransportPayload({
                    cmd: 'intermediate',
                    id: payload.id
                });
                const material = mesh.material;
                if (material instanceof Material) {
                    MaterialUtils.addMaterial(materialTP.materials, material.name, material, false, false);
                }
                const meshTP = new MeshTransportPayload({
                    cmd: 'intermediate',
                    id: payload.id
                });
                MeshTransportPayloadUtils.setMesh(meshTP, mesh, 0);
                meshTP.materialsTransportPayload = materialTP;

                const packed = MeshTransportPayloadUtils.packMeshTransportPayload(meshTP, false);
                self.postMessage(packed.payload, packed.transferables);
            }

            // signal complete
            payload.cmd = 'execComplete';
            const packedFinal = DataTransportPayloadUtils.packDataTransportPayload(payload as DataTransportPayload, false);
            self.postMessage(packedFinal.payload, packedFinal.transferables);
        }
    }

}

const worker = new OBJLoaderWorker();
self.onmessage = message => worker.comRouting(message);

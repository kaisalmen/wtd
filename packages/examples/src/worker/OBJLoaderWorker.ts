import {
    Mesh,
    Material
} from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
    comRouting,
    AssociatedArrayType,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerMessage,
    WorkerTaskWorker
} from 'wtd-core';
import {
    MaterialsPayload,
    MaterialUtils,
    MeshPayload,
} from 'wtd-three-ext';

class OBJLoaderWorker implements WorkerTaskWorker {

    private localData = {
        objLoader: undefined as OBJLoader | undefined,
        materials: new Map() as Map<string, Material>,
        buffer: undefined as ArrayBufferLike | undefined,
        objectId: 'unknown'
    };

    init(message: WorkerMessage) {
        console.log(`OBJLoaderWorker#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        const wm = WorkerMessage.unpack(message, false);
        if (wm.payloads.length === 2) {
            const dataPayload = wm.payloads[0] as DataPayload;
            const materialsPayload = wm.payloads[1] as MaterialsPayload;

            this.localData.buffer = dataPayload.message.buffers?.get('modelData');
            this.localData.materials = materialsPayload.message.materials;

            const initComplete = WorkerMessage.createFromExisting(wm, {
                overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
            });
            self.postMessage(initComplete);
        }
    }

    execute(message: WorkerMessage) {
        console.log(`OBJLoaderWorker#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        this.localData.objLoader = new OBJLoader();
        this.localData.objectId = message.uuid as string;

        const materials: AssociatedArrayType<unknown> = {};
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
            mesh.name = mesh.name + message.uuid;

            // signal intermediate feedback
            const intermediate = WorkerMessage.createFromExisting(message, {
                overrideCmd: WorkerTaskCommandResponse.INTERMEDIATE_CONFIRM
            });

            const meshPayload = new MeshPayload();
            meshPayload.setMesh(mesh, 0);
            intermediate.addPayload(meshPayload);

            const material = mesh.material;
            if (material instanceof Material) {
                const materialPayload = new MaterialsPayload();
                MaterialUtils.addMaterial(materialPayload.message.materials, material.name, material, false, false);
                intermediate.addPayload(materialPayload);
            }

            const transferables = WorkerMessage.pack(intermediate.payloads, false);
            self.postMessage(intermediate, transferables);
        }

        // signal complete
        const execComplete = WorkerMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
        });
        self.postMessage(execComplete);
    }

}

const worker = new OBJLoaderWorker();
self.onmessage = message => comRouting(worker, message);

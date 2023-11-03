import {
    Mesh,
    Material
} from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import {
    AssociatedArrayType,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerTaskMessageType,
    WorkerTaskWorker,
    comRouting,
    createFromExisting,
    pack,
    unpack
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
        objectId: 0
    };

    init(message: WorkerTaskMessageType) {
        console.log(`OBJLoaderWorker#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = unpack(message, false);
        if (wtm.payloads.length === 2) {
            const dataPayload = wtm.payloads[0] as DataPayload;
            const materialsPayload = wtm.payloads[1] as MaterialsPayload;

            this.localData.buffer = dataPayload.message.buffers?.get('modelData');
            this.localData.materials = materialsPayload.message.materials;

            const initComplete = createFromExisting(wtm, WorkerTaskCommandResponse.INIT_COMPLETE);
            self.postMessage(initComplete);
        }
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`OBJLoaderWorker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        this.localData.objLoader = new OBJLoader();
        this.localData.objectId = message.id as number;

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
            mesh.name = mesh.name + message.id;

            // signal intermediate feedback
            const intermediate = createFromExisting(message, WorkerTaskCommandResponse.INTERMEDIATE_CONFIRM);

            const meshPayload = new MeshPayload();
            meshPayload.setMesh(mesh, 0);
            intermediate.addPayload(meshPayload);

            const material = mesh.material;
            if (material instanceof Material) {
                const materialPayload = new MaterialsPayload();
                MaterialUtils.addMaterial(materialPayload.message.materials, material.name, material, false, false);
                intermediate.addPayload(materialPayload);
            }

            const transferables = pack(intermediate.payloads, false);
            self.postMessage(intermediate, transferables);
        }

        // signal complete
        const execComplete = createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        self.postMessage(execComplete);
    }

}

const worker = new OBJLoaderWorker();
self.onmessage = message => comRouting(worker, message);

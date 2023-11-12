import {
    TorusKnotGeometry,
    Color,
    MeshPhongMaterial
} from 'three';
import {
    comRouting,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskMessageConfig,
    WorkerTaskWorker
} from 'wtd-core';
import {
    MaterialUtils,
    MeshPayload,
    MaterialsPayload,
} from 'wtd-three-ext';

class InfiniteWorkerInternalGeometry implements WorkerTaskWorker {

    init(message: WorkerTaskMessageConfig) {
        const initComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageConfig) {
        const bufferGeometry = new TorusKnotGeometry(20, 3, 100, 64);
        bufferGeometry.name = 'tmProto' + message.id;

        const vertexBA = bufferGeometry.getAttribute('position');
        const vertexArray = vertexBA.array;
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] + 10 * (Math.random() - 0.5);
        }

        const randArray = new Uint8Array(3);
        self.crypto.getRandomValues(randArray);
        const color = new Color();
        color.r = randArray[0] / 255;
        color.g = randArray[1] / 255;
        color.b = randArray[2] / 255;
        const material = new MeshPhongMaterial({ color: color });

        const materialsPayload = new MaterialsPayload();
        MaterialUtils.addMaterial(materialsPayload.message.materials, 'randomColor' + message.id, material, false, false);
        materialsPayload.cleanMaterials();

        const meshPayload = new MeshPayload();
        meshPayload.setBufferGeometry(bufferGeometry, 2);

        const execComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        execComplete.addPayload(meshPayload);
        execComplete.addPayload(materialsPayload);

        const transferables = WorkerTaskMessage.pack(execComplete.payloads, false);
        self.postMessage(execComplete, transferables);
    }
}

const worker = new InfiniteWorkerInternalGeometry();
self.onmessage = message => comRouting(worker, message);

import {
    TorusKnotGeometry,
    Color,
    MeshPhongMaterial
} from 'three';
import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';
import {
    MaterialUtils,
    MeshPayload,
    MaterialsPayload,
} from 'wtd-three-ext';

class InfiniteWorkerInternalGeometry extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(message: WorkerTaskMessageType) {
        const initComplete = WorkerTaskMessage.createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        const bufferGeometry = new TorusKnotGeometry(20, 3, 100, 64);
        bufferGeometry.name = 'tmProto' + message.id;

        const vertexBA = bufferGeometry.getAttribute('position');
        const vertexArray = vertexBA.array as number[];
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
        MaterialUtils.addMaterial(materialsPayload.materials, 'randomColor' + message.id, material, false, false);
        materialsPayload.cleanMaterials();

        const meshPayload = new MeshPayload();
        meshPayload.setBufferGeometry(bufferGeometry, 2);

        const execComplete = WorkerTaskMessage.createFromExisting(message, 'execComplete');
        execComplete.addPayload(meshPayload);
        execComplete.addPayload(materialsPayload);

        const transferables = execComplete.pack(false);
        self.postMessage(execComplete, transferables);
    }
}

const worker = new InfiniteWorkerInternalGeometry();
self.onmessage = message => worker.comRouting(message);

import {
    TorusKnotBufferGeometry,
    Color,
    MeshPhongMaterial
} from 'three';
import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    PayloadType
} from 'wtd';
import {
    MaterialUtils,
    MeshTransportPayload,
    MaterialsTransportPayload,
    MaterialsTransportPayloadUtils,
    MeshTransportPayloadUtils,
} from 'three-wtm';

class InfiniteWorkerInternalGeometry extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(payload: PayloadType) {
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: PayloadType) {
        const bufferGeometry = new TorusKnotBufferGeometry(20, 3, 100, 64);
        bufferGeometry.name = 'tmProto' + payload.id;

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

        const materialTP = new MaterialsTransportPayload('execComplete', payload.id);
        MaterialUtils.addMaterial(materialTP.materials, 'randomColor' + payload.id, material, false, false);
        MaterialsTransportPayloadUtils.cleanMaterials(materialTP);

        const meshTP = new MeshTransportPayload('execComplete', payload.id);
        MeshTransportPayloadUtils.setBufferGeometry(meshTP, bufferGeometry, 2);
        meshTP.materialsTransportPayload = materialTP;

        const packed = MeshTransportPayloadUtils.packMeshTransportPayload(meshTP, false);
        self.postMessage(packed.payload, packed.transferables);
    }
}

const worker = new InfiniteWorkerInternalGeometry();
self.onmessage = message => worker.comRouting(message);

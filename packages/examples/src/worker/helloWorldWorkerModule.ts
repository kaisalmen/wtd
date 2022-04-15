import { SphereBufferGeometry } from 'three';
import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    PayloadType,
} from 'wtd';
import {
    MeshTransportPayloadUtils,
    MeshTransportPayload
} from 'three-wtm';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorldWorker extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(payload: PayloadType) {
        console.log(`HelloWorldWorker#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        self.postMessage(payload);
    }

    execute(payload: PayloadType) {
        console.log(`HelloWorldWorker#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);

        const bufferGeometry = new SphereBufferGeometry(40, 64, 64);
        bufferGeometry.name = payload.name + payload.id;
        const vertexArray = bufferGeometry.getAttribute('position').array as number[];
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] * Math.random() * 0.48;
        }

        const mtp = new MeshTransportPayload('execComplete', payload.id, payload.name);
        MeshTransportPayloadUtils.setBufferGeometry(mtp, bufferGeometry, 0);
        const packed = MeshTransportPayloadUtils.packMeshTransportPayload(mtp, false);
        self.postMessage(packed.payload, packed.transferables);
    }

}

const worker = new HelloWorldWorker();
self.onmessage = message => worker.comRouting(message);

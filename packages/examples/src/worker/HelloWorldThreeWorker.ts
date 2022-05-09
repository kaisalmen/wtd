import { SphereBufferGeometry } from 'three';
import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorlThreedWorker extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`HelloWorldWorker#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        message.cmd = 'initComplete';
        self.postMessage(message);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`HelloWorldWorker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const bufferGeometry = new SphereBufferGeometry(40, 64, 64);
        bufferGeometry.name = message.name ?? 'unknown' + message.id ?? 'unknown';
        const vertexArray = bufferGeometry.getAttribute('position').array as number[];
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] * Math.random() * 0.48;
        }

        const meshPayload = new MeshPayload();
        meshPayload.setBufferGeometry(bufferGeometry, 0);

        const execCompleteMessage = new WorkerTaskMessage({
            cmd: 'execComplete',
            name: message.name,
            id: message.id,
            workerId: message.workerId
        });
        execCompleteMessage.addPayload(meshPayload);

        const transferables = execCompleteMessage.pack(false);
        self.postMessage(execCompleteMessage, transferables);
    }

}

const worker = new HelloWorlThreedWorker();
self.onmessage = message => worker.comRouting(message);

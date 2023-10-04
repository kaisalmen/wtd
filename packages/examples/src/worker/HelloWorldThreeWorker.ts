import { SphereGeometry } from 'three';
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

        const initComplete = WorkerTaskMessage.createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`HelloWorldWorker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const bufferGeometry = new SphereGeometry(40, 64, 64);
        bufferGeometry.name = message.name ?? 'unknown' + message.id ?? 'unknown';
        const vertexArray = bufferGeometry.getAttribute('position').array;
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] * Math.random() * 0.48;
        }

        const meshPayload = new MeshPayload();
        meshPayload.setBufferGeometry(bufferGeometry, 0);

        const execComplete = WorkerTaskMessage.createFromExisting(message, 'execComplete');
        execComplete.addPayload(meshPayload);

        const transferables = execComplete.pack(false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new HelloWorlThreedWorker();
self.onmessage = message => worker.comRouting(message);

import { SphereGeometry } from 'three';
import {
    comRouting,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskMessageConfig,
    WorkerTaskWorker
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

export class HelloWorlThreedWorker implements WorkerTaskWorker {

    init(message: WorkerTaskMessageConfig) {
        console.log(`HelloWorldWorker#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageConfig) {
        console.log(`HelloWorldWorker#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const bufferGeometry = new SphereGeometry(40, 64, 64);
        bufferGeometry.name = message.name ?? 'unknown' + message.id ?? 'unknown';
        const vertexArray = bufferGeometry.getAttribute('position').array;
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] * Math.random() * 0.48;
        }

        const meshPayload = new MeshPayload();
        meshPayload.setBufferGeometry(bufferGeometry, 0);

        const execComplete = WorkerTaskMessage.createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
        execComplete.addPayload(meshPayload);

        const transferables = WorkerTaskMessage.pack(execComplete.payloads, false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new HelloWorlThreedWorker();
self.onmessage = message => comRouting(worker, message);

import { SphereGeometry } from 'three';
import {
    comRouting,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskWorker
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

export class HelloWorlThreedWorker implements WorkerTaskWorker {

    init(message: WorkerTaskMessage) {
        console.log(`HelloWorldWorker#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const initComplete = WorkerTaskMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessage) {
        console.log(`HelloWorldWorker#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const bufferGeometry = new SphereGeometry(40, 64, 64);
        bufferGeometry.name = message.name ?? 'unknown' + message.uuid ?? 'unknown';
        const vertexArray = bufferGeometry.getAttribute('position').array;
        for (let i = 0; i < vertexArray.length; i++) {
            vertexArray[i] = vertexArray[i] * Math.random() * 0.48;
        }

        const meshPayload = new MeshPayload();
        meshPayload.setBufferGeometry(bufferGeometry, 0);

        const execComplete = WorkerTaskMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
        });
        execComplete.addPayload(meshPayload);

        const transferables = WorkerTaskMessage.pack(execComplete.payloads, false);
        self.postMessage(execComplete, transferables);
    }

}

const worker = new HelloWorlThreedWorker();
self.onmessage = message => comRouting(worker, message);

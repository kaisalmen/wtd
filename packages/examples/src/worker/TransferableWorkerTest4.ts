import { TorusKnotGeometry } from 'three';
import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    WorkerTaskMessage
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest4 extends WorkerTaskDefaultWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest4#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        message.cmd = 'initComplete';
        self.postMessage(message);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest4#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);
        if (wtm.payloads.length === 1) {
            const payload = wtm.payloads[0];
            const bufferGeometry = new TorusKnotGeometry(20, 3, payload.params?.segments as number, payload.params?.segments as number);
            bufferGeometry.name = wtm.name;

            const meshPayload = new MeshPayload();
            meshPayload.setBufferGeometry(bufferGeometry, 0);

            const execComplete = WorkerTaskMessage.createFromExisting(wtm, 'execComplete');
            execComplete.addPayload(meshPayload);

            const transferables = execComplete.pack(false);
            self.postMessage(execComplete, transferables);
        }
    }

}

const worker = new TransferableWorkerTest4();
self.onmessage = message => worker.comRouting(message);

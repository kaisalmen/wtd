import { TorusKnotBufferGeometry } from 'three';
import {
    WorkerTaskDirectorWorker,
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskMessageType,
    WorkerTaskMessage
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest4 extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

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
            const bufferGeometry = new TorusKnotBufferGeometry(20, 3, payload.params?.segments as number, payload.params?.segments as number);
            bufferGeometry.name = wtm.name;

            const meshPayload = new MeshPayload();
            meshPayload.setBufferGeometry(bufferGeometry, 0);

            wtm.cleanPayloads();
            wtm.addPayload(meshPayload);

            wtm.cmd = 'execComplete';
            const transferables = wtm.pack(false);
            self.postMessage(wtm, transferables);
        }
    }

}

const worker = new TransferableWorkerTest4();
self.onmessage = message => worker.comRouting(message);

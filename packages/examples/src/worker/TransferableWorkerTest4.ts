import { TorusKnotGeometry } from 'three';
import {
    WorkerTaskMessageType,
    DataPayload,
    createFromExisting,
    unpack,
    pack,
    WorkerTaskCommandResponse,
    WorkerTaskWorker,
    comRouting
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

class TransferableWorkerTest4 implements WorkerTaskWorker {

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest4#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
        message.cmd = WorkerTaskCommandResponse.INIT_COMPLETE;
        self.postMessage(message);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest4#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = unpack(message, false);
        if (wtm.payloads.length === 1) {
            const payload = wtm.payloads[0] as DataPayload;
            const bufferGeometry = new TorusKnotGeometry(20, 3, payload.message.params?.segments as number, payload.message.params?.segments as number);
            bufferGeometry.name = wtm.name;

            const meshPayload = new MeshPayload();
            meshPayload.setBufferGeometry(bufferGeometry, 0);

            const execComplete = createFromExisting(wtm, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
            execComplete.addPayload(meshPayload);

            const transferables = pack(execComplete.payloads, false);
            self.postMessage(execComplete, transferables);
        }
    }

}

const worker = new TransferableWorkerTest4();
self.onmessage = message => comRouting(worker, message);

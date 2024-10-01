import { TorusKnotGeometry } from 'three';
import {
    comRouting,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerMessage,
    WorkerTaskWorker
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

class TransferableWorkerTest4 implements WorkerTaskWorker {

    init(message: WorkerMessage) {
        console.log(`TransferableWorkerTest4#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);
        message.cmd = WorkerTaskCommandResponse.INIT_COMPLETE;
        self.postMessage(message);
    }

    execute(message: WorkerMessage) {
        console.log(`TransferableWorkerTest4#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        const wm = WorkerMessage.unpack(message, false);
        if (wm.payloads.length === 1) {
            const payload = wm.payloads[0] as DataPayload;
            const bufferGeometry = new TorusKnotGeometry(20, 3, payload.message.params?.segments as number, payload.message.params?.segments as number);
            bufferGeometry.name = wm.name;

            const meshPayload = new MeshPayload();
            meshPayload.setBufferGeometry(bufferGeometry, 0);

            const execComplete = WorkerMessage.createFromExisting(wm, {
                overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
            });
            execComplete.addPayload(meshPayload);

            const transferables = WorkerMessage.pack(execComplete.payloads, false);
            self.postMessage(execComplete, transferables);
        }
    }

}

const worker = new TransferableWorkerTest4();
self.onmessage = message => comRouting(worker, message);

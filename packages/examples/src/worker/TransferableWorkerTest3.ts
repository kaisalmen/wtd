import { BufferGeometry } from 'three';
import {
    comRouting,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerMessage,
    WorkerTaskWorker
} from 'wtd-core';
import {
    MeshPayload,
    packGeometryBuffers
} from 'wtd-three-ext';

class TransferableWorkerTest3 implements WorkerTaskWorker {

    private context = {
        initPayload: undefined as MeshPayload | undefined
    };

    init(message: WorkerMessage) {
        console.log(`TransferableWorkerTest3#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        const wm = WorkerMessage.unpack(message, false);
        if (wm.payloads.length > 0) {
            this.context.initPayload = wm.payloads[0] as MeshPayload;
        }

        const initComplete = WorkerMessage.createFromExisting(wm, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerMessage) {
        console.log(`TransferableWorkerTest3#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.endpointdId}`);

        if (this.context.initPayload !== undefined) {
            const wm = WorkerMessage.unpack(message, false);

            // just put the buffers into the buffers of a DataPayload
            const bufferGeometry = this.context.initPayload.message.bufferGeometry;
            const dataPayload = new DataPayload();
            dataPayload.message.params = {
                geometry: this.context.initPayload.message.bufferGeometry
            };
            if (bufferGeometry !== undefined && dataPayload.message.buffers !== undefined) {
                packGeometryBuffers(false, bufferGeometry as BufferGeometry, dataPayload.message.buffers);
            }

            const execComplete = WorkerMessage.createFromExisting(wm, {
                overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
            });
            execComplete.addPayload(dataPayload);

            const transferables = WorkerMessage.pack(execComplete.payloads, false);
            self.postMessage(execComplete, transferables);
        }
    }
}

const worker = new TransferableWorkerTest3();
self.onmessage = message => comRouting(worker, message);

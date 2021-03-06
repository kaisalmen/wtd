import { BufferGeometry } from 'three';
import {
    WorkerTaskDirectorWorker,
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskMessageType,
    WorkerTaskMessage,
    DataPayload
} from 'wtd-core';
import {
    MeshPayload,
    MeshPayloadHandler
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest3 extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    private context = {
        initPayload: undefined as MeshPayload | undefined
    };

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest3#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);
        if (wtm.payloads.length > 0) {
            this.context.initPayload = wtm.payloads[0] as MeshPayload;
        }

        const initComplete = WorkerTaskMessage.createFromExisting(wtm, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest3#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        if (this.context.initPayload) {
            const wtm = WorkerTaskMessage.unpack(message, false);

            // just put the buffers into the buffers of a DataPayload
            const bufferGeometry = this.context.initPayload.bufferGeometry;
            const dataPayload = new DataPayload();
            dataPayload.params = {
                geometry: this.context.initPayload.bufferGeometry
            };
            if (bufferGeometry) {
                MeshPayloadHandler.packGeometryBuffers(false, bufferGeometry as BufferGeometry, dataPayload.buffers);
            }

            const execComplete = WorkerTaskMessage.createFromExisting(wtm, 'execComplete');
            execComplete.addPayload(dataPayload);

            const transferables = execComplete.pack(false);
            self.postMessage(execComplete, transferables);
        }
    }
}

const worker = new TransferableWorkerTest3();
self.onmessage = message => worker.comRouting(message);

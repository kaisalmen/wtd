import { BufferGeometry } from 'three';
import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    DataPayload,
    createFromExisting,
    unpack,
    pack
} from 'wtd-core';
import {
    MeshPayload,
    packGeometryBuffers
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest3 extends WorkerTaskDefaultWorker {

    private context = {
        initPayload: undefined as MeshPayload | undefined
    };

    init(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest3#init: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = unpack(message, false);
        if (wtm.payloads.length > 0) {
            this.context.initPayload = wtm.payloads[0] as MeshPayload;
        }

        const initComplete = createFromExisting(wtm, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        console.log(`TransferableWorkerTest3#execute: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

        if (this.context.initPayload) {
            const wtm = unpack(message, false);

            // just put the buffers into the buffers of a DataPayload
            const bufferGeometry = this.context.initPayload.message.bufferGeometry;
            const dataPayload = new DataPayload();
            dataPayload.message.params = {
                geometry: this.context.initPayload.message.bufferGeometry
            };
            if (bufferGeometry && dataPayload.message.buffers) {
                packGeometryBuffers(false, bufferGeometry as BufferGeometry, dataPayload.message.buffers);
            }

            const execComplete = createFromExisting(wtm, 'execComplete');
            execComplete.addPayload(dataPayload);

            const transferables = pack(execComplete.payloads, false);
            self.postMessage(execComplete, transferables);
        }
    }
}

const worker = new TransferableWorkerTest3();
self.onmessage = message => worker.comRouting(message);

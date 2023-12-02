import { BufferGeometry } from 'three';
import {
    comRouting,
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
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

    init(message: WorkerTaskMessage) {
        console.log(`TransferableWorkerTest3#init: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.workerId}`);

        const wtm = WorkerTaskMessage.unpack(message, false);
        if (wtm.payloads && wtm.payloads?.length > 0) {
            this.context.initPayload = wtm.payloads[0] as MeshPayload;
        }

        const initComplete = WorkerTaskMessage.createFromExisting(wtm, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessage) {
        console.log(`TransferableWorkerTest3#execute: name: ${message.name} uuid: ${message.uuid} cmd: ${message.cmd} workerId: ${message.workerId}`);

        if (this.context.initPayload) {
            const wtm = WorkerTaskMessage.unpack(message, false);

            // just put the buffers into the buffers of a DataPayload
            const bufferGeometry = this.context.initPayload.message.bufferGeometry;
            const dataPayload = new DataPayload();
            dataPayload.message.params = {
                geometry: this.context.initPayload.message.bufferGeometry
            };
            if (bufferGeometry && dataPayload.message.buffers) {
                packGeometryBuffers(false, bufferGeometry as BufferGeometry, dataPayload.message.buffers);
            }

            const execComplete = WorkerTaskMessage.createFromExisting(wtm, {
                overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
            });
            execComplete.addPayload(dataPayload);

            const transferables = WorkerTaskMessage.pack(execComplete.payloads, false);
            self.postMessage(execComplete, transferables);
        }
    }
}

const worker = new TransferableWorkerTest3();
self.onmessage = message => comRouting(worker, message);

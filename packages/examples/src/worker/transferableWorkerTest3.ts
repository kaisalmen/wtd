import { BufferGeometry } from 'three';
import {
    WorkerTaskDirectorWorker,
    WorkerTaskDirectorDefaultWorker,
    DataTransportPayload,
    DataTransportPayloadUtils
} from 'wtd';
import {
    MeshTransportPayload,
    MeshTransportPayloadUtils
} from 'three-wtm';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest3 extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    private context = {
        initPayload: undefined as MeshTransportPayload | undefined
    };

    init(payload: MeshTransportPayload) {
        console.log(`TransferableWorkerTest3#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);

        this.context.initPayload = payload;
        const initAnswer = new DataTransportPayload('initComplete', payload.id, payload.name);
        self.postMessage(initAnswer);
    }

    execute(payload: DataTransportPayload) {
        console.log(`TransferableWorkerTest3#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);

        if (this.context.initPayload) {
            const mtp = MeshTransportPayloadUtils.unpackMeshTransportPayload(this.context.initPayload, false);

            payload.cmd = 'execComplete';
            payload.name = mtp.name as string;
            payload.params = {
                geometry: mtp.bufferGeometry as unknown as Record<string, unknown>
            };
            if (mtp.bufferGeometry) {
                MeshTransportPayloadUtils.packGeometryBuffers(false, mtp.bufferGeometry as BufferGeometry, payload.buffers);
            }
            const packed = DataTransportPayloadUtils.packDataTransportPayload(payload, false);
            self.postMessage(packed.payload, packed.transferables);
        }
    }
}

const worker = new TransferableWorkerTest3();
self.onmessage = message => worker.comRouting(message);

import { TorusKnotBufferGeometry } from 'three';
import { DataTransportPayload, DataTransportPayloadUtils, MeshTransportPayloadUtils, WorkerTaskManagerDefaultWorker, WorkerTaskManagerWorker } from 'three-wtm';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest3 extends WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {

    init(payload: DataTransportPayload) {
        console.log(`TransferableWorkerTest3#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: DataTransportPayload) {
        console.log(`TransferableWorkerTest3#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        if (payload.params) {
            const bufferGeometry = new TorusKnotBufferGeometry(20, 3, payload.params.segments as number, payload.params.segments as number);
            bufferGeometry.name = payload.params.name as string;

            payload.cmd = 'execComplete';
            payload.name = payload.params.name as string;
            payload.params = {
                geometry: bufferGeometry as unknown as Record<string, unknown>
            };
            MeshTransportPayloadUtils.packGeometryBuffers(false, bufferGeometry, payload.buffers);
            const packed = DataTransportPayloadUtils.packDataTransportPayload(payload, false);
            self.postMessage(packed.payload, packed.transferables);
        }
    }
}

const worker = new TransferableWorkerTest3();
self.onmessage = message => worker.comRouting(message);

import { TorusKnotBufferGeometry } from 'three';
import { DataTransport, Payload, WorkerTaskManagerDefaultWorker, WorkerTaskManagerWorker } from 'three-wtm';

class TransferableWorkerTest3 extends WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {

    init(payload: Payload) {
        console.log(`TransferableWorkerTest3#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: Payload) {
        console.log(`TransferableWorkerTest3#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        if (payload.params) {
            const bufferGeometry = new TorusKnotBufferGeometry(20, 3, payload.params.segments as number, payload.params.segments as number);
            bufferGeometry.name = payload.params.name as string;

            const dt = new DataTransport('execComplete', payload.id);
            dt.getPayload().name = payload.params.name as string;
            dt.getPayload().params = bufferGeometry as unknown as Record<string, unknown>;
            const packed = dt.package(false);
            self.postMessage(packed.payload, packed.transferables);
        }
    }
}

const worker = new TransferableWorkerTest3();
self.onmessage = message => worker.comRouting(message);

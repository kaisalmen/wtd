import { DataTransport, Payload, WorkerTaskManagerDefaultWorker, WorkerTaskManagerWorker } from 'three-wtm';

class TransferableWorkerTest2 extends WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {
    init(payload: Payload) {
        console.log(`TransferableWorkerTest2#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: Payload) {
        console.log(`TransferableWorkerTest4#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        if (payload.params) {
            const dt = new DataTransport('execComplete', payload.id);
            dt.getPayload().name = payload.params.name as string;
            dt.getPayload().addBuffer('data', new Uint32Array(32 * 1024 * 1024));
            const packed = dt.package(false);
            self.postMessage(packed.payload, packed.transferables);
        }
    }
}

const worker = new TransferableWorkerTest2();
self.onmessage = message => worker.comRouting(message);

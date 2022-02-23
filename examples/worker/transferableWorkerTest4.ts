import { TorusKnotBufferGeometry } from 'three';
import { MeshTransport, Payload, WorkerTaskManagerDefaultWorker, WorkerTaskManagerWorker } from 'three-wtm';

class TransferableWorkerTest4 extends WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {

    init(payload: Payload) {
        console.log(`HelloWorldWorker#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: Payload) {
        console.log(`HelloWorldWorker#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        if (payload.params) {
            const bufferGeometry = new TorusKnotBufferGeometry(20, 3, payload.params.segments as number, payload.params.segments as number);
            bufferGeometry.name = payload.name;

            const mt = new MeshTransport('execComplete', payload.id)
                .setGeometry(bufferGeometry, 2)
                .package(false);
            const data = mt.getData();
            self.postMessage(data.main, data.transferables);
        }

    }
}

const worker = new TransferableWorkerTest4();
self.onmessage = message => worker.comRouting(message);

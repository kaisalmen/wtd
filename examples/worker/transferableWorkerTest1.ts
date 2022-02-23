import { Payload, WorkerTaskManagerDefaultWorker, WorkerTaskManagerWorker } from 'three-wtm';

class TransferableWorkerTest1 extends WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {

    init(payload: Payload) {
        console.log(`HelloWorldWorker#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: Payload) {
        console.log(`HelloWorldWorker#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        payload.cmd = 'execComplete';
        payload.params = {
            data: new Uint32Array(32 * 1024 * 1024)
        };
        self.postMessage(payload);
    }

}

const worker = new TransferableWorkerTest1();
self.onmessage = message => worker.comRouting(message);

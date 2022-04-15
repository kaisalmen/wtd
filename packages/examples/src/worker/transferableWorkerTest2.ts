import {
    WorkerTaskDirectorWorker,
    WorkerTaskDirectorDefaultWorker,
    DataTransportPayload,
    DataTransportPayloadUtils
} from 'wtd';

declare const self: DedicatedWorkerGlobalScope;

class TransferableWorkerTest2 extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {
    init(payload: DataTransportPayload) {
        console.log(`TransferableWorkerTest2#init: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        payload.cmd = 'initComplete';
        self.postMessage(payload);
    }

    execute(payload: DataTransportPayload) {
        console.log(`TransferableWorkerTest4#execute: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
        if (payload.params) {
            const payloadOut = new DataTransportPayload('execComplete', payload.id);
            payloadOut.name = payload.params.name as string;
            payloadOut.buffers.set('data', new Uint32Array(32 * 1024 * 1024));
            const packed = DataTransportPayloadUtils.packDataTransportPayload(payloadOut, false);
            self.postMessage(packed.payload, packed.transferables);
        }
    }
}

const worker = new TransferableWorkerTest2();
self.onmessage = message => worker.comRouting(message);

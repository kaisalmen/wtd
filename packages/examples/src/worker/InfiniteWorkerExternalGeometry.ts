import {
    BufferGeometry
} from 'three';
import {
    WorkerTaskCommandResponse,
    WorkerTaskDefaultWorker,
    WorkerTaskMessageType,
    createFromExisting,
    pack,
    unpack
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class InfiniteWorkerExternalGeometry extends WorkerTaskDefaultWorker {

    private bufferGeometry?: BufferGeometry = undefined;

    init(message: WorkerTaskMessageType) {
        const wtm = unpack(message, false);
        this.bufferGeometry = (wtm.payloads[0] as MeshPayload).message.bufferGeometry as BufferGeometry;

        const initComplete = createFromExisting(message, WorkerTaskCommandResponse.INIT_COMPLETE);
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        if (!this.bufferGeometry) {
            self.postMessage(new Error('No initial payload available'));
        } else {
            // clone before re-using as othewise transferables can not be obtained
            const geometry = this.bufferGeometry.clone();

            if (geometry) {
                geometry.name = 'tmProto' + message.id;

                const vertexArray = geometry.getAttribute('position').array;
                for (let i = 0; i < vertexArray.length; i++) {
                    vertexArray[i] = vertexArray[i] + 10 * (Math.random() - 0.5);
                }

                const meshPayload = new MeshPayload();
                meshPayload.setBufferGeometry(geometry, 2);

                const randArray = new Uint8Array(3);
                self.crypto.getRandomValues(randArray);
                meshPayload.message.params = {
                    color: {
                        r: randArray[0] / 255,
                        g: randArray[1] / 255,
                        b: randArray[2] / 255
                    }
                };

                const execComplete = createFromExisting(message, WorkerTaskCommandResponse.EXECUTE_COMPLETE);
                execComplete.addPayload(meshPayload);

                const transferables = pack(execComplete.payloads, false);
                self.postMessage(execComplete, transferables);
            }
        }
    }
}

const worker = new InfiniteWorkerExternalGeometry();
self.onmessage = message => worker.comRouting(message);

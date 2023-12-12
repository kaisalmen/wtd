import {
    BufferGeometry
} from 'three';
import {
    WorkerTaskCommandResponse,
    WorkerTaskMessage,
    WorkerTaskWorker,
    comRouting
} from 'wtd-core';
import {
    MeshPayload
} from 'wtd-three-ext';

class InfiniteWorkerExternalGeometry implements WorkerTaskWorker {

    private bufferGeometry?: BufferGeometry = undefined;

    init(message: WorkerTaskMessage) {
        const wtm = WorkerTaskMessage.unpack(message, false);
        if (wtm.payloads && wtm.payloads?.length > 0) {
            this.bufferGeometry = (wtm.payloads[0] as MeshPayload).message.bufferGeometry as BufferGeometry;
        }

        const initComplete = WorkerTaskMessage.createFromExisting(message, {
            overrideCmd: WorkerTaskCommandResponse.INIT_COMPLETE
        });
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessage) {
        if (!this.bufferGeometry) {
            self.postMessage(new Error('No initial payload available'));
        } else {
            // clone before re-using as othewise transferables can not be obtained
            const geometry = this.bufferGeometry.clone();

            if (geometry) {
                geometry.name = 'tmProto' + message.uuid;

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

                const execComplete = WorkerTaskMessage.createFromExisting(message, {
                    overrideCmd: WorkerTaskCommandResponse.EXECUTE_COMPLETE
                });
                execComplete.addPayload(meshPayload);

                const transferables = WorkerTaskMessage.pack(execComplete.payloads, false);
                self.postMessage(execComplete, transferables);
            }
        }
    }
}

const worker = new InfiniteWorkerExternalGeometry();
self.onmessage = message => comRouting(worker, message);

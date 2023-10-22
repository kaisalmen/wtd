import {
    BufferGeometry
} from 'three';
import {
    WorkerTaskDefaultWorker,
    WorkerTaskMessage,
    WorkerTaskMessageType,
    createFromExisting,
    pack
} from 'wtd-core';
import {
    MeshPayload, MeshPayloadHandler
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class InfiniteWorkerExternalGeometry extends WorkerTaskDefaultWorker {

    private localData = {
        meshPayloadRaw: undefined as MeshPayload | undefined
    };

    init(message: WorkerTaskMessage) {
        this.localData.meshPayloadRaw = message.payloads[0] as MeshPayload;

        const initComplete = createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        if (!this.localData.meshPayloadRaw) {
            self.postMessage(new Error('No initial payload available'));
        }
        else {
            // unpack for every usage to ensure Transferables are not re-used
            const meshPayload = new MeshPayloadHandler().unpack(this.localData.meshPayloadRaw, true) as MeshPayload;
            const geometry = meshPayload.message.bufferGeometry as BufferGeometry;

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

                const execComplete = createFromExisting(message, 'execComplete');
                execComplete.addPayload(meshPayload);

                const transferables = pack(execComplete.payloads, false);
                self.postMessage(execComplete, transferables);
            }
        }

    }
}

const worker = new InfiniteWorkerExternalGeometry();
self.onmessage = message => worker.comRouting(message);

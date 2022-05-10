import {
    BufferGeometry
} from 'three';
import {
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';
import {
    MeshPayload, MeshPayloadHandler, MeshPayloadType,
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class InfiniteWorkerExternalGeometry extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    private localData = {
        meshPayloadRaw: undefined as MeshPayloadType | undefined
    };

    init(message: WorkerTaskMessage) {
        this.localData.meshPayloadRaw = message.payloads[0] as MeshPayload;

        const initComplete = WorkerTaskMessage.createFromExisting(message, 'initComplete');
        self.postMessage(initComplete);
    }

    execute(message: WorkerTaskMessageType) {
        if (!this.localData.meshPayloadRaw) {
            self.postMessage(new Error('No initial payload available'));
        }
        else {
            // unpack for every usage to ensure Transferables are not re-used
            const meshPayload = MeshPayloadHandler.unpack(this.localData.meshPayloadRaw, true) as MeshPayload;
            const geometry = meshPayload.bufferGeometry as BufferGeometry;

            if (geometry) {
                geometry.name = 'tmProto' + message.id;

                const vertexArray = geometry.getAttribute('position').array as number[];
                for (let i = 0; i < vertexArray.length; i++) {
                    vertexArray[i] = vertexArray[i] + 10 * (Math.random() - 0.5);
                }

                const meshPayload = new MeshPayload();
                meshPayload.setBufferGeometry(geometry, 2);

                const randArray = new Uint8Array(3);
                self.crypto.getRandomValues(randArray);
                meshPayload.params = {
                    color: {
                        r: randArray[0] / 255,
                        g: randArray[1] / 255,
                        b: randArray[2] / 255
                    }
                };

                const execComplete = WorkerTaskMessage.createFromExisting(message, 'execComplete');
                execComplete.addPayload(meshPayload);

                const transferables = execComplete.pack(false);
                self.postMessage(execComplete, transferables);
            }
        }

    }
}

const worker = new InfiniteWorkerExternalGeometry();
self.onmessage = message => worker.comRouting(message);

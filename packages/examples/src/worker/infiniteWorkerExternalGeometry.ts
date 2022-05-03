import {
    BufferGeometry
} from 'three';
import {
    DataTransportPayload,
    WorkerTaskDirectorDefaultWorker,
    WorkerTaskDirectorWorker
} from 'wtd-core';
import {
    MeshTransportPayload,
    MeshTransportPayloadUtils,
} from 'wtd-three-ext';

declare const self: DedicatedWorkerGlobalScope;

class InfiniteWorkerExternalGeometry extends WorkerTaskDirectorDefaultWorker implements WorkerTaskDirectorWorker {

    private localData = {
        initPayload: undefined as MeshTransportPayload | undefined
    };

    init(payload: MeshTransportPayload) {
        this.localData.initPayload = payload;
        const initAnswer = new DataTransportPayload({
            cmd: 'initComplete',
            id: payload.id,
            name: payload.name
        });
        self.postMessage(initAnswer);
    }

    execute(payload: DataTransportPayload) {
        if (!this.localData.initPayload) {
            self.postMessage(new Error('No initial payload available'));
        }
        else {
            const mtp = MeshTransportPayloadUtils.unpackMeshTransportPayload(this.localData.initPayload, true);
            const geometry = mtp.bufferGeometry as BufferGeometry;

            if (geometry) {
                geometry.name = 'tmProto' + payload.id;

                const vertexArray = geometry.getAttribute('position').array as number[];
                for (let i = 0; i < vertexArray.length; i++) {
                    vertexArray[i] = vertexArray[i] + 10 * (Math.random() - 0.5);
                }

                const sender = new MeshTransportPayload({
                    cmd: 'execComplete',
                    id: payload.id
                });
                MeshTransportPayloadUtils.setBufferGeometry(sender, geometry, 2);

                const randArray = new Uint8Array(3);
                self.crypto.getRandomValues(randArray);
                sender.params = {
                    color: {
                        r: randArray[0] / 255,
                        g: randArray[1] / 255,
                        b: randArray[2] / 255
                    }
                };
                const packed = MeshTransportPayloadUtils.packMeshTransportPayload(sender, false);
                self.postMessage(packed.payload, packed.transferables);
            }
        }

    }
}

const worker = new InfiniteWorkerExternalGeometry();
self.onmessage = message => worker.comRouting(message);

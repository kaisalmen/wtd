//import { SphereBufferGeometry } from 'three';
import { PayloadConfig, WorkerTaskManagerDefaultWorker, WorkerTaskManagerWorker } from 'three-wtm';
//import { MeshTransport } from '../../src/loaders/utils/TransportUtils';

declare const self: DedicatedWorkerGlobalScope;

export class HelloWorldWorker extends WorkerTaskManagerDefaultWorker implements WorkerTaskManagerWorker {

    init(workerId: string, config: PayloadConfig) {
        console.log(config);
        self.postMessage({ cmd: 'init', id: workerId });
    }

    execute(workerId: string, config: PayloadConfig) {
        console.log(config);
        self.postMessage({ cmd: 'executeComplete', id: workerId });
        /*
            let bufferGeometry = new SphereBufferGeometry(40, 64, 64);
            bufferGeometry.name = config.name + config.id;
            let vertexArray = bufferGeometry.getAttribute('position').array;
            for (let i = 0; i < vertexArray.length; i++) vertexArray[i] = vertexArray[i] * Math.random() * 0.48;
            new MeshTransport('execComplete', config.id)
                .setGeometry(bufferGeometry, 0)
                .package(false)
                .postMessage(context);
        */
    }

}

const simpleWorker = new HelloWorldWorker();
self.onmessage = message => simpleWorker.comRouting(message);

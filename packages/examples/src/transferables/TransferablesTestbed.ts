import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import {
    DataPayload,
    WorkerTaskDirector,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';
import {
    MeshPayload,
    MeshPayloadHandler
} from 'wtd-three-ext';

type CameraDefaults = {
    posCamera: THREE.Vector3;
    posCameraTarget: THREE.Vector3;
    near: number;
    far: number;
    fov: number;
};

type ExampleTask = {
    execute: boolean;
    id: number;
    name: string;
    sendGeometry: boolean;
    url: URL;
    segments: number;
}

class TransferablesTestbed {

    private renderer: THREE.WebGLRenderer;
    private canvas: HTMLElement;
    private scene: THREE.Scene = new THREE.Scene();
    private camera: THREE.PerspectiveCamera;
    private cameraTarget: THREE.Vector3;
    private cameraDefaults: CameraDefaults = {
        posCamera: new THREE.Vector3(1000.0, 1000.0, 1000.0),
        posCameraTarget: new THREE.Vector3(0, 0, 0),
        near: 0.1,
        far: 10000,
        fov: 45
    };
    private controls: TrackballControls;
    private workerTaskDirector: WorkerTaskDirector = new WorkerTaskDirector({
        defaultMaxParallelExecutions: 1,
        verbose: true
    });
    private tasks: ExampleTask[] = [];

    constructor(elementToBindTo: HTMLElement | null) {
        if (elementToBindTo === null) {
            throw Error('Bad element HTML given as canvas.');
        }

        this.canvas = elementToBindTo;
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setClearColor(0x050505);

        this.cameraTarget = this.cameraDefaults.posCameraTarget;
        this.camera = new THREE.PerspectiveCamera(this.cameraDefaults.fov, this.recalcAspectRatio(), this.cameraDefaults.near, this.cameraDefaults.far);
        this.resetCamera();

        this.controls = new TrackballControls(this.camera, this.renderer.domElement);

        this.tasks.push({
            execute: true,
            id: 1,
            name: 'TransferableWorkerTest1',
            sendGeometry: false,
            url: new URL(import.meta.env.DEV ? '../worker/TransferableWorkerTest1.ts' : '../worker/generated/TransferableWorkerTest1-es.js', import.meta.url),
            segments: 0
        });
        this.tasks.push({
            execute: true,
            id: 2,
            name: 'TransferableWorkerTest2',
            sendGeometry: false,
            url: new URL(import.meta.env.DEV ? '../worker/TransferableWorkerTest2.ts' : '../worker/generated/TransferableWorkerTest2-es.js', import.meta.url),
            segments: 0
        });
        this.tasks.push({
            execute: true,
            id: 3,
            name: 'TransferableWorkerTest3',
            sendGeometry: true,
            url: new URL(import.meta.env.DEV ? '../worker/TransferableWorkerTest3.ts' : '../worker/generated/TransferableWorkerTest3-es.js', import.meta.url),
            segments: 1024
        });
        this.tasks.push({
            execute: true,
            id: 4,
            name: 'TransferableWorkerTest4',
            sendGeometry: false,
            url: new URL(import.meta.env.DEV ? '../worker/TransferableWorkerTest4.ts' : '../worker/generated/TransferableWorkerTest4-es.js', import.meta.url),
            segments: 1024
        });

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setClearColor(0x050505);

        this.scene = new THREE.Scene();

        this.recalcAspectRatio();
        this.camera = new THREE.PerspectiveCamera(this.cameraDefaults.fov, this.recalcAspectRatio(), this.cameraDefaults.near, this.cameraDefaults.far);
        this.resetCamera();
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight1 = new THREE.DirectionalLight(0xC0C090);
        const directionalLight2 = new THREE.DirectionalLight(0xC0C090);

        directionalLight1.position.set(- 100, - 50, 100);
        directionalLight2.position.set(100, 50, - 100);

        this.scene.add(directionalLight1);
        this.scene.add(directionalLight2);
        this.scene.add(ambientLight);

        const helper = new THREE.GridHelper(1000, 30, 0xFF4444, 0x404040);
        this.scene.add(helper);
    }

    resizeDisplayGL() {
        this.controls.handleResize();
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight, false);
        this.updateCamera();
    }

    recalcAspectRatio() {
        return (this.canvas.offsetHeight === 0) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
    }

    resetCamera() {
        this.camera.position.copy(this.cameraDefaults.posCamera);
        this.cameraTarget.copy(this.cameraDefaults.posCameraTarget);
        this.updateCamera();
    }

    updateCamera() {
        this.camera.aspect = this.recalcAspectRatio();
        this.camera.lookAt(this.cameraTarget);
        this.camera.updateProjectionMatrix();
    }

    render() {
        if (!this.renderer.autoClear) this.renderer.clear();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    async run() {
        console.time('All tasks have been initialized');
        await Promise.all(app.initTasks()).then(() => {
            console.timeEnd('All tasks have been initialized');
            app.executeTasks();
        }).catch(x => alert(x));
    }

    /**
     * Registers any selected task at the {@link WorkerTaskDirector} and initializes them.
     *
     * @return {Promise<any>}
     */
    private initTasks() {
        const awaiting = [];
        for (const task of this.tasks) {
            awaiting.push(this.initTask(task));
        }
        return awaiting;
    }

    private initTask(task: ExampleTask) {
        // fast-fail: direct resolve a void Promise
        if (!task.execute) {
            return new Promise<void>((resolve, _reject) => {
                resolve();
            });
        }

        this.workerTaskDirector.registerTask(task.name, {
            module: true,
            blob: false,
            url: task.url
        });

        const initMessage = new WorkerTaskMessage({
            id: task.id,
            name: task.name
        });
        if (task.sendGeometry) {
            const torus = new THREE.TorusGeometry(25, 8, 16, 100);
            torus.name = 'torus';

            const meshPayload = new MeshPayload();
            meshPayload.setBufferGeometry(torus, 0);
            initMessage.addPayload(meshPayload);

            const transferables = initMessage.pack(false);
            return this.workerTaskDirector.initTaskType(initMessage.name, initMessage, transferables);
        }
        else {
            return this.workerTaskDirector.initTaskType(initMessage.name, initMessage);
        }
    }

    private async executeTasks() {
        console.time('Execute tasks');
        const awaiting = [];
        for (const task of this.tasks) {
            if (task.execute) {
                awaiting.push(this.executeWorker(task));
            }
        }
        await Promise.all(awaiting).then(() => {
            console.timeEnd('Execute tasks');
            console.log('All worker executions have been completed');
        });
    }

    private executeWorker(task: ExampleTask) {
        const execMessage = new WorkerTaskMessage({
            id: task.id,
            name: task.name
        });

        const dataPayload = new DataPayload();
        dataPayload.params = {
            name: task.name,
            segments: task.segments
        };
        execMessage.addPayload(dataPayload);
        const transferables = execMessage.pack(false);

        return this.workerTaskDirector.enqueueWorkerExecutionPlan({
            message: execMessage,
            taskTypeName: task.name,
            onComplete: (m: WorkerTaskMessageType) => {
                this.processMessage(m);
            },
            transferables: transferables
        });
    }

    private processMessage(message: WorkerTaskMessageType) {
        let wtm;
        switch (message.cmd) {
            case 'execComplete':
                console.log(`TransferableTestbed#execComplete: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

                wtm = WorkerTaskMessage.unpack(message, false);
                if (wtm.payloads.length === 1) {

                    const payload = wtm.payloads[0];
                    if (payload.type === DataPayload.TYPE) {
                        const dataPayload = payload;
                        if (dataPayload.params && Object.keys(dataPayload.params).length > 0 &&
                            dataPayload.params.geometry) {
                            //  && (payload.params.geometry as Record<string, unknown>).type === 'TorusKnotGeometry'
                            const mesh = new THREE.Mesh(
                                MeshPayloadHandler.reconstructBuffer(false, dataPayload.params.geometry as THREE.BufferGeometry),
                                new THREE.MeshPhongMaterial({ color: new THREE.Color(0xff0000) })
                            );
                            mesh.position.set(100, 0, 0);
                            this.scene.add(mesh);
                        }
                        else {
                            console.log(`${message.name}: Just data`);
                        }
                    }

                    if (payload.type === MeshPayload.TYPE) {
                        const meshPayload = payload as MeshPayload;
                        if (meshPayload.bufferGeometry) {
                            const mesh = new THREE.Mesh(
                                meshPayload.bufferGeometry as THREE.BufferGeometry,
                                new THREE.MeshPhongMaterial({ color: new THREE.Color(0xff0000) })
                            );
                            this.scene.add(mesh);
                        }
                    }
                }
                break;

            default:
                console.error(`${message.id}: Received unknown command: ${message.cmd}`);
                break;
        }
    }
}

const app = new TransferablesTestbed(document.getElementById('example'));

window.addEventListener('resize', () => app.resizeDisplayGL(), false);

console.log('Starting initialisation phase...');
app.resizeDisplayGL();

const requestRender = function() {
    requestAnimationFrame(requestRender);
    app.render();
};
requestRender();

app.run();

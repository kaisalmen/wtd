import {
    AmbientLight,
    BufferGeometry,
    Color,
    DirectionalLight,
    GridHelper,
    Mesh,
    MeshPhongMaterial,
    PerspectiveCamera,
    Scene,
    TorusGeometry,
    Vector3,
    WebGLRenderer
} from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import {
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerTaskDirector,
    WorkerTaskMessage,
    WorkerTaskMessageConfig
} from 'wtd-core';
import {
    MeshPayload, reconstructBuffer
} from 'wtd-three-ext';

type CameraDefaults = {
    posCamera: Vector3;
    posCameraTarget: Vector3;
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

    private renderer: WebGLRenderer;
    private canvas: HTMLElement;
    private scene: Scene = new Scene();
    private camera: PerspectiveCamera;
    private cameraTarget: Vector3;
    private cameraDefaults: CameraDefaults = {
        posCamera: new Vector3(1000.0, 1000.0, 1000.0),
        posCameraTarget: new Vector3(0, 0, 0),
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
        this.renderer = new WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setClearColor(0x050505);

        this.cameraTarget = this.cameraDefaults.posCameraTarget;
        this.camera = new PerspectiveCamera(this.cameraDefaults.fov, this.recalcAspectRatio(), this.cameraDefaults.near, this.cameraDefaults.far);
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

        this.renderer = new WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setClearColor(0x050505);

        this.scene = new Scene();

        this.recalcAspectRatio();
        this.camera = new PerspectiveCamera(this.cameraDefaults.fov, this.recalcAspectRatio(), this.cameraDefaults.near, this.cameraDefaults.far);
        this.resetCamera();
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);

        const ambientLight = new AmbientLight(0x404040);
        const directionalLight1 = new DirectionalLight(0xC0C090);
        const directionalLight2 = new DirectionalLight(0xC0C090);

        directionalLight1.position.set(- 100, - 50, 100);
        directionalLight2.position.set(100, 50, - 100);

        this.scene.add(directionalLight1);
        this.scene.add(directionalLight2);
        this.scene.add(ambientLight);

        const helper = new GridHelper(1000, 30, 0xFF4444, 0x404040);
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
        try {
            await Promise.all(app.initTasks());
            console.timeEnd('All tasks have been initialized');
            app.executeTasks();
        } catch (e) {
            alert(e);
        }
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
            return new Promise<void>((resolve) => {
                resolve();
            });
        }

        this.workerTaskDirector.registerTask(task.name, {
            $type: 'WorkerConfigParams',
            workerType: 'module',
            blob: false,
            url: task.url
        });

        const initMessage = new WorkerTaskMessage({
            id: task.id,
            name: task.name
        });
        if (task.sendGeometry) {
            const torus = new TorusGeometry(25, 8, 16, 100);
            torus.name = 'torus';

            const meshPayload = new MeshPayload();
            meshPayload.setBufferGeometry(torus, 0);
            initMessage.addPayload(meshPayload);

            const transferables = WorkerTaskMessage.pack(initMessage.payloads, false);
            return this.workerTaskDirector.initTaskType(initMessage.name!, {
                message: initMessage,
                transferables,
                copyTransferables: true
            });
        }
        else {
            return this.workerTaskDirector.initTaskType(initMessage.name!, {
                message: initMessage
            });
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
        await Promise.all(awaiting);
        console.timeEnd('Execute tasks');
        console.log('All worker executions have been completed');
    }

    private executeWorker(task: ExampleTask) {
        const execMessage = new WorkerTaskMessage({
            id: task.id,
            name: task.name
        });

        const dataPayload = new DataPayload();
        dataPayload.message.params = {
            name: task.name,
            segments: task.segments
        };
        execMessage.addPayload(dataPayload);
        const transferables = WorkerTaskMessage.pack(execMessage.payloads, false);

        return this.workerTaskDirector.enqueueWorkerExecutionPlan(task.name, {
            message: execMessage,
            onComplete: (m: WorkerTaskMessageConfig) => {
                this.processMessage(m);
            },
            transferables: transferables
        });
    }

    private processMessage(message: WorkerTaskMessageConfig) {
        let wtm;
        switch (message.cmd) {
            case WorkerTaskCommandResponse.EXECUTE_COMPLETE:
                console.log(`TransferableTestbed#execComplete: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);

                wtm = WorkerTaskMessage.unpack(message, false);
                if (wtm.payloads?.length === 1) {

                    const payload = wtm.payloads[0];
                    if (payload.$type === 'DataPayload') {
                        const dataPayload = payload as DataPayload;
                        if (dataPayload.message.params && Object.keys(dataPayload.message.params).length > 0 &&
                            dataPayload.message.params.geometry) {
                            const mesh = new Mesh(
                                reconstructBuffer(false, dataPayload.message.params.geometry as BufferGeometry),
                                new MeshPhongMaterial({ color: new Color(0xff0000) })
                            );
                            mesh.position.set(100, 0, 0);
                            this.scene.add(mesh);
                        }
                        else {
                            console.log(`${message.name}: Just data`);
                        }
                    }

                    if (payload.$type === 'MeshPayload') {
                        const meshPayload = payload as MeshPayload;
                        if (meshPayload.message.bufferGeometry) {
                            const mesh = new Mesh(
                                meshPayload.message.bufferGeometry as BufferGeometry,
                                new MeshPhongMaterial({ color: new Color(0xff0000) })
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

import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

import {
    DataTransportPayload,
    PayloadType,
    WorkerTaskDirector
} from 'wtd';
import {
    MeshTransportPayload,
    MeshTransportPayloadUtils
} from 'three-wtm';

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
    moduleURL: URL;
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
    private workerTaskDirector: WorkerTaskDirector = new WorkerTaskDirector(1).setVerbose(true);
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
            name: 'transferableWorkerTest1',
            sendGeometry: false,
            moduleURL: new URL('../worker/transferableWorkerTest1', import.meta.url),
            segments: 0
        });
        this.tasks.push({
            execute: true,
            id: 2,
            name: 'transferableWorkerTest2',
            sendGeometry: false,
            moduleURL: new URL('../worker/transferableWorkerTest2', import.meta.url),
            segments: 0
        });
        this.tasks.push({
            execute: true,
            id: 3,
            name: 'transferableWorkerTest3',
            sendGeometry: true,
            moduleURL: new URL('../worker/transferableWorkerTest3', import.meta.url),
            segments: 1024
        });
        this.tasks.push({
            execute: true,
            id: 4,
            name: 'transferableWorkerTest4',
            sendGeometry: false,
            moduleURL: new URL('../worker/transferableWorkerTest4', import.meta.url),
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
        this.workerTaskDirector.registerTask(task.name, {
            module: true,
            blob: false,
            url: task.moduleURL
        });
        if (task.sendGeometry) {
            const torus = new THREE.TorusBufferGeometry(25, 8, 16, 100);
            torus.name = 'torus';
            const payloadToSend = new MeshTransportPayload('init', task.id, task.name);
            MeshTransportPayloadUtils.setBufferGeometry(payloadToSend, torus, 0);

            const packed = MeshTransportPayloadUtils.packMeshTransportPayload(payloadToSend, false);
            return this.workerTaskDirector.initTaskType(task.name, packed.payload, packed.transferables);
        }
        else {
            const payload = new DataTransportPayload('init', task.id, task.name);
            return this.workerTaskDirector.initTaskType(task.name, payload);
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
        const payload = new DataTransportPayload('execute', task.id, task.name);
        payload.params = {
            name: task.name,
            segments: task.segments
        };
        return this.workerTaskDirector.enqueueWorkerExecutionPlan({
            payload: payload,
            taskTypeName: task.name,
            onComplete: (e: unknown) => {
                this.processMessage(e as PayloadType);
            }
        });
    }

    private processMessage(payload: PayloadType) {
        switch (payload.cmd) {
            case 'execComplete':
                console.log(`TransferableTestbed#execComplete: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
                if (payload.type === 'DataTransportPayload') {
                    if (payload.params && Object.keys(payload.params).length > 0 &&
                        payload.params.geometry) {
                        //  && (payload.params.geometry as Record<string, unknown>).type === 'TorusKnotGeometry'
                        const mesh = new THREE.Mesh(
                            MeshTransportPayloadUtils.reconstructBuffer(false, payload.params.geometry as THREE.BufferGeometry),
                            new THREE.MeshPhongMaterial({ color: new THREE.Color(0xff0000) })
                        );
                        mesh.position.set(100, 0, 0);
                        this.scene.add(mesh);
                    }
                    else {
                        console.log(`${payload.name}: Just data`);
                    }
                }
                else if (payload.type === 'MeshTransportPayload') {
                    const mtp = MeshTransportPayloadUtils.unpackMeshTransportPayload(payload as MeshTransportPayload, false);
                    if (mtp.bufferGeometry) {
                        const mesh = new THREE.Mesh(
                            mtp.bufferGeometry as THREE.BufferGeometry,
                            new THREE.MeshPhongMaterial({ color: new THREE.Color(0xff0000) })
                        );
                        this.scene.add(mesh);
                    }
                }
                break;

            default:
                console.error(payload.id + ': Received unknown command: ' + payload.cmd);
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

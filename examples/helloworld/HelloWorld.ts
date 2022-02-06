import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

import { WorkerTaskManager, Payload } from 'three-wtm';

//import { HelloWorldWorker } from '../worker/helloWorldWorkerModule?Worker';

/*
import {
    DataTransport,
    GeometryTransport,
    MeshTransport,
    MaterialsTransport,
    ObjectUtils,
    DeUglify
} from '/src/loaders/utils/TransportUtils';
import { MaterialUtils } from '/src/loaders/utils/MaterialUtils';
*/
export type CameraDefaults = {
    posCamera: THREE.Vector3;
    posCameraTarget: THREE.Vector3;
    near: number;
    far: number;
    fov: number;
};

/**
 * Hello World example showing standard and module worker using three
 */
class WorkerTaskManagerHelloWorldExample {

    renderer: THREE.WebGLRenderer;
    canvas: HTMLElement;
    scene: THREE.Scene = new THREE.Scene();
    camera: THREE.PerspectiveCamera;
    cameraTarget: THREE.Vector3;
    cameraDefaults: CameraDefaults = {
        posCamera: new THREE.Vector3(1000.0, 1000.0, 1000.0),
        posCameraTarget: new THREE.Vector3(0, 0, 0),
        near: 0.1,
        far: 10000,
        fov: 45
    };
    controls: TrackballControls;
    workerTaskManager: WorkerTaskManager = new WorkerTaskManager(2).setVerbose(true);

    constructor(elementToBindTo: HTMLElement | null) {
        if (elementToBindTo === null) throw Error('Bad element HTML given as canvas.');
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

        const ambientLight = new THREE.AmbientLight(0x404040);
        const directionalLight1 = new THREE.DirectionalLight(0xC0C090);
        const directionalLight2 = new THREE.DirectionalLight(0xC0C090);

        directionalLight1.position.set(- 100, - 50, 100);
        directionalLight2.position.set(100, 50, - 100);

        this.scene.add(directionalLight1);
        this.scene.add(directionalLight2);
        this.scene.add(ambientLight);

        const helper = new THREE.GridHelper(1000, 30, 0xFF4444, 0x404040);
        helper.name = 'grid';
        this.scene.add(helper);
    }

    /** Registers both workers as tasks at the {@link WorkerTaskManager} and initializes them.  */
    async initContent() {
        const awaitInit = [];
        const taskNameStandard = 'WorkerStandard';
        const workerStandardPC = { name: taskNameStandard, id: taskNameStandard };
        this.workerTaskManager.registerTaskTypeWithUrl(taskNameStandard, false, '../worker/helloWorldWorkerStandard?Worker');
        awaitInit.push(this.workerTaskManager.initTaskType(taskNameStandard, workerStandardPC));

        this.workerTaskManager.enqueueForExecution(taskNameStandard, workerStandardPC)
            .then((data: unknown) => {
                const cmd = (data as Payload).cmd;
                if (cmd === 'executeComplete') console.log(`${taskNameStandard}: executeComplete`);
            })
            .catch(e => console.error(e));

        const taskNameModule = 'WorkerModule';
        const workerModulePC = { name: taskNameModule, id: taskNameModule };
        this.workerTaskManager.registerTaskTypeWithUrl(taskNameModule, true, '../worker/helloWorldWorkerModule?Worker');
        awaitInit.push(this.workerTaskManager.initTaskType(taskNameModule, workerModulePC));
        await Promise.all(awaitInit);

        this.workerTaskManager.enqueueForExecution(taskNameModule, workerModulePC)
            .then((data: unknown) => {
                const cmd = (data as Payload).cmd;
                if (cmd === 'executeComplete') console.log(`${taskNameModule}: executeComplete`);
            })
            .catch(e => console.error(e));
        /*
                data => {
                    if (data.cmd === 'execComplete') {
                        const meshTransport = new MeshTransport().loadData(data).reconstruct(false);
                        const mesh = new THREE.Mesh(meshTransport.getBufferGeometry(), new THREE.MeshPhongMaterial());
                        this.scene.add(mesh);
                    }
                }
        */
    }

    /**
     * This method is invoked when {@link WorkerTaskManager} received a message from a worker.
     * @param {object} payload Message received from worker
     * @private
     */
    _processMessage(payload: Payload) {
        switch (payload.cmd) {
            case 'assetAvailable':
            case 'execComplete':
                break;
            default:
                console.error(payload.id + ': Received unknown command: ' + payload.cmd);
                break;

        }
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

}

const app = new WorkerTaskManagerHelloWorldExample(document.getElementById('example'));

window.addEventListener('resize', () => app.resizeDisplayGL(), false);

console.log('Starting initialisation phase...');
app.initContent();
app.resizeDisplayGL();

const requestRender = function() {
    requestAnimationFrame(requestRender);
    app.render();
};

requestRender();

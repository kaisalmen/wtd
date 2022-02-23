import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

import { WorkerTaskManager, Payload, MeshTransport } from 'three-wtm';
import { MeshTransportDef } from 'three-wtm';

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
    private workerTaskManager: WorkerTaskManager = new WorkerTaskManager(2).setVerbose(true);

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
        const workerStandardPC = { name: taskNameStandard, id: 0, cmd: 'init' } as Payload;
        this.workerTaskManager.registerTaskTypeWithUrl(taskNameStandard, false, new URL('../worker/helloWorldWorkerStandard', import.meta.url));
        awaitInit.push(this.workerTaskManager.initTaskType(taskNameStandard, workerStandardPC));

        this.workerTaskManager.enqueueForExecution(taskNameStandard, workerStandardPC)
            .then((e: unknown) => {
                const data = e as Payload;
                if (data.cmd === 'execComplete') {
                    console.log(`${taskNameStandard}: execComplete`);
                }
            })
            .catch((e: unknown) => console.error(e));

        const taskNameModule = 'WorkerModule';
        const workerModulePC = { name: taskNameModule, id: 0, cmd: 'init' } as Payload;
        this.workerTaskManager.registerTaskTypeWithUrl(taskNameModule, true, new URL('../worker/helloWorldWorkerModule', import.meta.url));
        awaitInit.push(this.workerTaskManager.initTaskType(taskNameModule, workerModulePC));
        await Promise.all(awaitInit);

        this.workerTaskManager.enqueueForExecution(taskNameModule, workerModulePC)
            .then((e: unknown) => {
                const data = e as Payload;
                if (data.cmd === 'execComplete') {
                    console.log(`${taskNameModule}: execComplete`);

                    const meshTransport = new MeshTransport();
                    meshTransport.loadData(data as MeshTransportDef).reconstruct(false);
                    const mesh = new THREE.Mesh(meshTransport.getBufferGeometry(), new THREE.MeshPhongMaterial());
                    this.scene.add(mesh);
                }
            })
            .catch((e: unknown) => console.error(e));
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

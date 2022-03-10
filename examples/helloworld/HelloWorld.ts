import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

import { WorkerTaskManager, PayloadType, MeshTransportPayload, MeshTransportPayloadUtils } from 'three-wtm';

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
        const workerStandardPC = { name: 'WorkerStandard', id: 0, cmd: 'init' } as PayloadType;
        this.workerTaskManager.registerTask(workerStandardPC.name, false, new URL('../worker/helloWorldWorkerStandard', import.meta.url));
        awaitInit.push(this.workerTaskManager.initTaskType(workerStandardPC.name, workerStandardPC));

        this.workerTaskManager.enqueueForExecution(workerStandardPC.name, workerStandardPC)
            .then((e: unknown) => {
                const data = e as PayloadType;
                if (data.cmd === 'execComplete') {
                    console.log(`${workerStandardPC.name}: execComplete`);
                }
            })
            .catch((e: unknown) => console.error(e));

        const workerModulePC = { name: 'WorkerModule', id: 0, cmd: 'init' } as PayloadType;
        this.workerTaskManager.registerTask(workerModulePC.name, true, new URL('../worker/helloWorldWorkerModule', import.meta.url));
        awaitInit.push(this.workerTaskManager.initTaskType(workerModulePC.name, workerModulePC));
        await Promise.all(awaitInit);

        this.workerTaskManager.enqueueForExecution(workerModulePC.name, workerModulePC)
            .then((e: unknown) => {
                const data = e as MeshTransportPayload;
                if (data.cmd === 'execComplete') {
                    console.log(`${workerModulePC.name}: execComplete`);

                    const mtp = MeshTransportPayloadUtils.unpackMeshTransportPayload(data, false);
                    if (mtp.bufferGeometry) {
                        const mesh = new THREE.Mesh(
                            mtp.bufferGeometry as THREE.BufferGeometry,
                            new THREE.MeshPhongMaterial()
                        );
                        this.scene.add(mesh);
                    }
                }
            })
            .catch((e: unknown) => console.error(e));
    }

    /**
     * This method is invoked when {@link WorkerTaskManager} received a message from a worker.
     * @param {object} payload Message received from worker
     * @private
     */
    _processMessage(payload: PayloadType) {
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
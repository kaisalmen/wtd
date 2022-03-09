
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import { WorkerTaskManager, PayloadType, MeshTransportPayload, DataTransportPayload, DataTransportPayloadUtils, MeshTransportPayloadUtils, MaterialsTransportPayloadUtils, MaterialStore, MaterialsTransportPayload } from 'three-wtm';

export type CameraDefaults = {
    posCamera: THREE.Vector3;
    posCameraTarget: THREE.Vector3;
    near: number;
    far: number;
    fov: number;
};

/**
 * The aim of this example is to show two possible ways how to use the {@link WorkerTaskManager}:
 * - Worker defined inline
 * - Wrapper around OBJLoader, so it can be executed as worker
 *
 * The workers perform the same loading operation over and over again. This is not what you want to do
 * in a real-world loading scenario, but it is very helpful to demonstrate that workers executed in
 * parallel to main utilizes the CPU.
 */
class WorkerTaskManagerExample {

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
    private workerTaskManager: WorkerTaskManager = new WorkerTaskManager(8).setVerbose(true);

    private objectsUsed: Map<number, THREE.Vector3> = new Map();
    private tasksToUse: PayloadType[] = [];
    private materialStore = new MaterialStore(true);

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

    /** Registers both workers as tasks at the {@link WorkerTaskManager} and initializes them.  */
    async initContent() {
        const awaiting: Array<Promise<void>> = [];

        const helloWorldWorker = new DataTransportPayload('init', 0);
        helloWorldWorker.name = 'HelloWorldWorker';
        this.workerTaskManager.registerTask(helloWorldWorker.name, true, new URL('../worker/helloWorldWorkerStandard', import.meta.url));
        this.tasksToUse.push(helloWorldWorker);
        awaiting.push(this.workerTaskManager.initTaskType(helloWorldWorker.name, helloWorldWorker));

        const objLoaderWorker = new MaterialsTransportPayload('init', 0);
        objLoaderWorker.name = 'OBJLoaderdWorker';
        objLoaderWorker.params = { filename: '../models/female02_vertex_colors.obj' };
        this.workerTaskManager.registerTask(objLoaderWorker.name, true, new URL('../worker/tmOBJLoader', import.meta.url));
        this.tasksToUse.push(objLoaderWorker);

        const loadObj = async function(filenameObj: string) {
            const fileLoader = new THREE.FileLoader();
            fileLoader.setResponseType('arraybuffer');
            return await fileLoader.loadAsync(filenameObj);
        };
        await loadObj(objLoaderWorker.params?.filename as string)
            .then((buffer: string | ArrayBuffer) => {
                objLoaderWorker.buffers.set('modelData', buffer as ArrayBufferLike);
                objLoaderWorker.materials = this.materialStore.getMaterials();
                MaterialsTransportPayloadUtils.cleanMaterials(objLoaderWorker);
                MaterialsTransportPayloadUtils.packMaterialsTransportPayload(objLoaderWorker, false);
                awaiting.push(this.workerTaskManager.initTaskType(objLoaderWorker.name, objLoaderWorker));
            });
        return await Promise.all(awaiting);
    }

    /** Once all tasks are initialized a 100 tasks are enqueued for execution by WorkerTaskManager. */
    async executeWorkers() {
        if (this.tasksToUse.length === 0) throw new Error('No Tasks have been selected. Aborting...');

        console.time('start');
        let globalCount = 0;
        let taskToUseIndex = 0;
        const executions = [];

        for (let i = 0; i < 1000; i++) {
            const payload = new DataTransportPayload('execute', globalCount);
            const payloadType = this.tasksToUse[taskToUseIndex];
            payload.name = `${payloadType.name}_${globalCount}`;
            payload.params = payloadType.params;
            const packed = DataTransportPayloadUtils.packDataTransportPayload(payload, false);

            const promise = this.workerTaskManager.enqueueForExecution(payloadType.name, packed.payload,
                (e: PayloadType) => this._processMessage(e), packed.transferables)
                .then((e: unknown) => {
                    const data = e as PayloadType;
                    this._processMessage(data);
                })
                .catch((e: unknown) => console.error(e));
            executions.push(promise);

            globalCount++;
            taskToUseIndex++;
            if (taskToUseIndex === this.tasksToUse.length) {
                taskToUseIndex = 0;
            }
        }
        await Promise.all(executions).then(() => {
            console.timeEnd('start');
            this.workerTaskManager.dispose();
        });
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
                if (payload.type === 'MeshTransportPayload') {
                    const mtp = MeshTransportPayloadUtils.unpackMeshTransportPayload(payload as MeshTransportPayload, false);
                    let material = MaterialsTransportPayloadUtils.processMaterialTransport(mtp.materialsTransportPayload, this.materialStore.getMaterials(), true);
                    if (!material) {
                        const randArray = new Uint8Array(3);
                        window.crypto.getRandomValues(randArray);
                        const color = new THREE.Color(randArray[0] / 255, randArray[1] / 255, randArray[2] / 255);
                        material = new THREE.MeshPhongMaterial({ color: color });
                    }
                    if (mtp.bufferGeometry) {
                        const mesh = new THREE.Mesh(mtp.bufferGeometry as THREE.BufferGeometry, material as THREE.Material);
                        this._addMesh(mesh, mtp.id);
                    }
                }
                else if (payload.type === 'DataTransportPayload') {
                    console.log(`execComplete: name: ${payload.name} id: ${payload.id} cmd: ${payload.cmd} workerId: ${payload.workerId}`);
                }
                break;

            default:
                console.error(payload.id + ': Received unknown command: ' + payload.cmd);
                break;
        }
    }

    /** Add mesh at random position, but keep sub-meshes of an object together, therefore we need */
    _addMesh(mesh: THREE.Mesh, id: number) {
        let pos = this.objectsUsed.get(id);
        if (!pos) {
            // sphere positions
            const baseFactor = 750;
            pos = new THREE.Vector3(baseFactor * Math.random(), baseFactor * Math.random(), baseFactor * Math.random());
            pos.applyAxisAngle(new THREE.Vector3(1, 0, 0), 2 * Math.PI * Math.random());
            pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), 2 * Math.PI * Math.random());
            pos.applyAxisAngle(new THREE.Vector3(0, 0, 1), 2 * Math.PI * Math.random());
            this.objectsUsed.set(id, pos);
        }
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.name = id + '' + mesh.name;
        this.scene.add(mesh);
    }
}

const app = new WorkerTaskManagerExample(document.getElementById('example'));

window.addEventListener('resize', () => app.resizeDisplayGL(), false);

console.log('Starting initialisation phase...');
app.resizeDisplayGL();

const requestRender = function() {
    requestAnimationFrame(requestRender);
    app.render();
};
requestRender();

console.time('Init tasks');
app.initContent().then(() => {
    console.timeEnd('Init tasks');
    app.executeWorkers();
}).catch(x => alert(x));

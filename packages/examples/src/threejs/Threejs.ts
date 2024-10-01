
import {
    AmbientLight,
    BufferGeometry,
    Color,
    DirectionalLight,
    FileLoader,
    GridHelper,
    Mesh,
    MeshPhongMaterial,
    PerspectiveCamera,
    Scene,
    Vector3,
    WebGLRenderer
} from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import {
    DataPayload,
    WorkerTaskCommandResponse,
    WorkerTaskDirector,
    WorkerMessage
} from 'wtd-core';
import {
    MaterialsPayload,
    MaterialStore,
    MeshPayload
} from 'wtd-three-ext';

export type CameraDefaults = {
    posCamera: Vector3;
    posCameraTarget: Vector3;
    near: number;
    far: number;
    fov: number;
};

/**
 * The aim of this example is to show two possible ways how to use the {@link WorkerTaskDirector}:
 * - Worker defined inline
 * - Wrapper around OBJLoader, so it can be executed as worker
 *
 * The workers perform the same loading operation over and over again. This is not what you want to do
 * in a real-world loading scenario, but it is very helpful to demonstrate that workers executed in
 * parallel to main utilizes the CPU.
 */
class WorkerTaskDirectorExample {

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
        defaultMaxParallelExecutions: 8,
        verbose: false
    });

    private objectsUsed: Map<string, Vector3> = new Map();
    private tasksToUse: string[] = [];
    private materialStore = new MaterialStore(true);

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

        const ambientLight = new AmbientLight(0x404040);
        const directionalLight1 = new DirectionalLight(0xC0C090);
        const directionalLight2 = new DirectionalLight(0xC0C090);

        directionalLight1.position.set(- 100, - 50, 100);
        directionalLight2.position.set(100, 50, - 100);

        this.scene.add(directionalLight1);
        this.scene.add(directionalLight2);
        this.scene.add(ambientLight);

        const helper = new GridHelper(1000, 30, 0xFF4444, 0x404040);
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

    run() {
        this.initTasks();
    }

    /** Registers both workers as tasks at the {@link WorkerTaskDirector} and initializes them.  */
    private async initTasks() {
        console.time('Init tasks');
        const awaiting: Array<Promise<string | ArrayBuffer | void | unknown[]>> = [];
        const helloWorldInitMessage = WorkerMessage.createNew({
            name: 'HelloWorldThreeWorker'
        });
        this.workerTaskDirector.registerTask({
            taskName: helloWorldInitMessage.name!,
            endpointConfig: {
                $type: 'WorkerConfigParams',
                workerType: 'module',
                blob: false,
                url: new URL(import.meta.env.DEV ? '../worker/HelloWorldThreeWorker.ts' : '../worker/generated/HelloWorldThreeWorker-es.js', import.meta.url)
            }
        });
        this.tasksToUse.push(helloWorldInitMessage.name!);
        awaiting.push(this.workerTaskDirector.initTaskType(helloWorldInitMessage.name!, {
            message: helloWorldInitMessage
        }));

        const objLoaderInitMessage = WorkerMessage.createNew({
            name: 'OBJLoaderdWorker'
        });
        this.workerTaskDirector.registerTask({
            taskName: objLoaderInitMessage.name!,
            endpointConfig: {
                $type: 'WorkerConfigParams',
                workerType: 'module',
                blob: false,
                url: new URL(import.meta.env.DEV ? '../worker/OBJLoaderWorker.ts' : '../worker/generated/OBJLoaderWorker-es.js', import.meta.url)
            }
        });
        this.tasksToUse.push(objLoaderInitMessage.name!);

        const loadObj = async () => {
            const fileLoader = new FileLoader();
            fileLoader.setResponseType('arraybuffer');

            const objFilename = new URL('../../models/obj/female02/female02_vertex_colors.obj', import.meta.url);
            return fileLoader.loadAsync(objFilename as unknown as string);
        };

        awaiting.push(loadObj());
        const result = await Promise.all(awaiting);
        console.log('Awaited all required init and data loading.');

        const objLoaderDataPayload = new DataPayload();
        objLoaderDataPayload.message.buffers?.set('modelData', result[1] as ArrayBufferLike);

        const materialsPayload = new MaterialsPayload();
        materialsPayload.message.materials = this.materialStore.getMaterials();
        materialsPayload.cleanMaterials();

        objLoaderInitMessage.addPayload(objLoaderDataPayload);
        objLoaderInitMessage.addPayload(materialsPayload);

        const transferables = WorkerMessage.pack(objLoaderInitMessage.payloads, false);
        await this.workerTaskDirector.initTaskType(objLoaderInitMessage.name!, {
            message: objLoaderInitMessage,
            transferables,
            copyTransferables: true
        });
        console.timeEnd('Init tasks');
        await this.executeTasks();
    }

    /** Once all tasks are initialized a 1024 tasks are enqueued for execution by WorkerTaskDirector. */
    private async executeTasks() {
        if (this.tasksToUse.length === 0) throw new Error('No Tasks have been selected. Aborting...');

        console.time('Execute tasks');
        let taskToUseIndex = 0;
        const executions = [];

        for (let i = 0; i < 1024; i++) {
            const name = this.tasksToUse[taskToUseIndex];

            const voidPromise = this.workerTaskDirector.enqueueForExecution(name, {
                message: WorkerMessage.createEmpty(),
                onComplete: (m: WorkerMessage) => {
                    this.processMessage(m);
                },
                onIntermediateConfirm: (m: WorkerMessage) => {
                    this.processMessage(m);
                }
            });
            executions.push(voidPromise);

            taskToUseIndex++;
            if (taskToUseIndex === this.tasksToUse.length) {
                taskToUseIndex = 0;
            }
        }
        await Promise.all(executions);
        console.timeEnd('Execute tasks');
        console.log('All worker executions have been completed');
        this.workerTaskDirector.dispose();
    }

    /**
     * This method is invoked when {@link WorkerTaskDirector} received a message from a worker.
     * @param {object} payload Message received from worker
     * @private
     */
    private processMessage(message: WorkerMessage) {
        const wm = WorkerMessage.unpack(message, false);
        switch (wm.cmd) {
            case WorkerTaskCommandResponse.INTERMEDIATE_CONFIRM:
            case WorkerTaskCommandResponse.EXECUTE_COMPLETE:
                if (wm.payloads.length === 1) {
                    this.buildMesh(wm.uuid, wm.payloads[0] as MeshPayload);
                }
                else if (wm.payloads.length === 2) {
                    this.buildMesh(wm.uuid, wm.payloads[0] as MeshPayload, wm.payloads[1] as MaterialsPayload);
                }
                if (wm.cmd === WorkerTaskCommandResponse.EXECUTE_COMPLETE) {
                    console.log(`execComplete: name: ${wm.name} uuid: ${wm.uuid} cmd: ${wm.cmd} workerId: ${wm.endpointdId}`);
                }
                break;

            default:
                console.error(`${wm.uuid}: Received unknown command: ${wm.cmd}`);
                break;
        }
    }

    private buildMesh(uuid: string, meshPayload: MeshPayload, materialsPayload?: MaterialsPayload) {
        let material;
        if (materialsPayload !== undefined) {
            material = materialsPayload.processMaterialTransport(this.materialStore.getMaterials(), true);
        } else {
            const randArray = new Uint8Array(3);
            window.crypto.getRandomValues(randArray);
            const color = new Color(randArray[0] / 255, randArray[1] / 255, randArray[2] / 255);
            material = new MeshPhongMaterial({ color: color });
        }

        if (meshPayload.message.bufferGeometry !== undefined) {
            const mesh = new Mesh(meshPayload.message.bufferGeometry as BufferGeometry, material);
            this.addMesh(mesh, uuid);
        }
    }

    /** Add mesh at random position, but keep sub-meshes of an object together, therefore we need */
    private addMesh(mesh: Mesh, uuid: string) {
        let pos = this.objectsUsed.get(uuid);
        if (!pos) {
            // sphere positions
            const baseFactor = 750;
            pos = new Vector3(baseFactor * Math.random(), baseFactor * Math.random(), baseFactor * Math.random());
            pos.applyAxisAngle(new Vector3(1, 0, 0), 2 * Math.PI * Math.random());
            pos.applyAxisAngle(new Vector3(0, 1, 0), 2 * Math.PI * Math.random());
            pos.applyAxisAngle(new Vector3(0, 0, 1), 2 * Math.PI * Math.random());
            this.objectsUsed.set(uuid, pos);
        }
        mesh.position.set(pos.x, pos.y, pos.z);
        mesh.name = uuid + '' + mesh.name;
        this.scene.add(mesh);
    }
}

const app = new WorkerTaskDirectorExample(document.getElementById('example'));

window.addEventListener('resize', () => app.resizeDisplayGL(), false);

console.log('Starting initialisation phase...');
app.resizeDisplayGL();

const requestRender = () => {
    requestAnimationFrame(requestRender);
    app.render();
};
requestRender();

app.run();

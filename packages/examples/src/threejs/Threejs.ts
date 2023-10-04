
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

import {
    DataPayload,
    WorkerTaskDirector,
    WorkerTaskMessage,
    WorkerTaskMessageType,
} from 'wtd-core';
import {
    MaterialsPayload,
    MaterialStore,
    MeshPayload
} from 'wtd-three-ext';

export type CameraDefaults = {
    posCamera: THREE.Vector3;
    posCameraTarget: THREE.Vector3;
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
        defaultMaxParallelExecutions: 8,
        verbose: true
    });

    private objectsUsed: Map<number, THREE.Vector3> = new Map();
    private tasksToUse: string[] = [];
    private materialStore = new MaterialStore(true);

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

    run() {
        this.initTasks();
    }

    /** Registers both workers as tasks at the {@link WorkerTaskDirector} and initializes them.  */
    private async initTasks() {
        console.time('Init tasks');
        const awaiting: Array<Promise<string | ArrayBuffer | void | unknown[]>> = [];
        const helloWorldInitMessage = new WorkerTaskMessage({
            id: 0,
            name: 'HelloWorldThreeWorker'
        });
        this.workerTaskDirector.registerTask(helloWorldInitMessage.name, {
            module: true,
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/HelloWorldThreeWorker.ts' : '../worker/generated/HelloWorldThreeWorker-es.js', import.meta.url)
        });
        this.tasksToUse.push(helloWorldInitMessage.name);
        awaiting.push(this.workerTaskDirector.initTaskType(helloWorldInitMessage.name, helloWorldInitMessage));

        const objLoaderInitMessage = new WorkerTaskMessage({
            id: 0,
            name: 'OBJLoaderdWorker'
        });

        this.workerTaskDirector.registerTask(objLoaderInitMessage.name, {
            module: true,
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/OBJLoaderWorker.ts' : '../worker/generated/OBJLoaderWorker-es.js', import.meta.url)
        });
        this.tasksToUse.push(objLoaderInitMessage.name);

        const loadObj = async function() {
            const fileLoader = new THREE.FileLoader();
            fileLoader.setResponseType('arraybuffer');

            const objFilename = new URL('../../models/obj/female02/female02_vertex_colors.obj', import.meta.url);
            return fileLoader.loadAsync(objFilename as unknown as string);
        };

        awaiting.push(loadObj());
        const result = await Promise.all(awaiting);
        console.log('Loaded OBJ');

        const objLoaderDataPayload = new DataPayload();
        objLoaderDataPayload.buffers.set('modelData', result[1] as ArrayBufferLike);

        const materialsPayload = new MaterialsPayload();
        materialsPayload.materials = this.materialStore.getMaterials();
        materialsPayload.cleanMaterials();

        objLoaderInitMessage.addPayload(objLoaderDataPayload);
        objLoaderInitMessage.addPayload(materialsPayload);

        const transferables = objLoaderInitMessage.pack(false);
        await this.workerTaskDirector.initTaskType(objLoaderInitMessage.name, objLoaderInitMessage, transferables);
        console.timeEnd('Init tasks');
        this.executeTasks();
    }

    /** Once all tasks are initialized a 1024 tasks are enqueued for execution by WorkerTaskDirector. */
    private async executeTasks() {
        if (this.tasksToUse.length === 0) throw new Error('No Tasks have been selected. Aborting...');

        console.time('Execute tasks');
        let globalCount = 0;
        let taskToUseIndex = 0;
        const executions = [];

        for (let i = 0; i < 1024; i++) {
            const name = this.tasksToUse[taskToUseIndex];

            const execMessage = new WorkerTaskMessage({
                id: globalCount,
                name: `${name}_${globalCount}`
            });

            const voidPromise = this.workerTaskDirector.enqueueWorkerExecutionPlan({
                taskTypeName: name ?? 'unknown',
                message: execMessage,
                onComplete: (m: WorkerTaskMessageType) => {
                    this.processMessage(m);
                },
                onIntermediate: (m: WorkerTaskMessageType) => {
                    this.processMessage(m);
                }
            });
            executions.push(voidPromise);

            globalCount++;
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
    private processMessage(message: WorkerTaskMessageType) {
        const wtm = WorkerTaskMessage.unpack(message, false);
        switch (wtm.cmd) {
            case 'intermediate':
            case 'execComplete':
                if (wtm.payloads.length === 1) {
                    this.buildMesh(wtm.id, wtm.payloads[0] as MeshPayload);
                }
                else if (wtm.payloads.length === 2) {
                    this.buildMesh(wtm.id, wtm.payloads[0] as MeshPayload, wtm.payloads[1] as MaterialsPayload);
                }
                if (wtm.cmd === 'execComplete') {
                    console.log(`execComplete: name: ${message.name} id: ${message.id} cmd: ${message.cmd} workerId: ${message.workerId}`);
                }
                break;

            default:
                console.error(`${message.id}: Received unknown command: ${message.cmd}`);
                break;
        }
    }

    private buildMesh(id: number, meshPayload: MeshPayload, materialsPayload?: MaterialsPayload) {
        let material;
        if (!materialsPayload) {
            const randArray = new Uint8Array(3);
            window.crypto.getRandomValues(randArray);
            const color = new THREE.Color(randArray[0] / 255, randArray[1] / 255, randArray[2] / 255);
            material = new THREE.MeshPhongMaterial({ color: color });
        }
        else {
            material = materialsPayload.processMaterialTransport(this.materialStore.getMaterials(), true);
        }
        if (meshPayload.bufferGeometry) {
            const mesh = new THREE.Mesh(meshPayload.bufferGeometry as THREE.BufferGeometry, material as THREE.Material);
            this.addMesh(mesh, id);
        }
    }

    /** Add mesh at random position, but keep sub-meshes of an object together, therefore we need */
    private addMesh(mesh: THREE.Mesh, id: number) {
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

const app = new WorkerTaskDirectorExample(document.getElementById('example'));

window.addEventListener('resize', () => app.resizeDisplayGL(), false);

console.log('Starting initialisation phase...');
app.resizeDisplayGL();

const requestRender = function() {
    requestAnimationFrame(requestRender);
    app.render();
};
requestRender();

app.run();

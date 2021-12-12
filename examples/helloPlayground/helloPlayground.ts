import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import * as Comlink from 'comlink';
import { spawn, Thread } from 'threads';

import HelloComlinkWorker from '/examples/helloPlayground/helloComlinkWorker.ts?worker';
import HelloThreadsWorker from '/examples/helloPlayground/helloThreadsWorker.ts?worker';

import { createObjectBuffer, getUnderlyingArrayBuffer } from '@bnaya/objectbuffer';

export type CameraDefaults = {
    posCamera: THREE.Vector3;
    posCameraTarget: THREE.Vector3;
    near: number;
    far: number;
    fov: number;
};

class HelloPlayground {

    renderer: THREE.WebGLRenderer;
    canvas: HTMLElement;
    scene: THREE.Scene;
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

    constructor(elementToBindTo: HTMLElement | null) {
        if (elementToBindTo === null) throw Error('Bad element HTML given as canvas.');
        this.canvas = elementToBindTo;
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setClearColor(0x050505);

        this.scene = new THREE.Scene();
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
        this.scene.add(helper);
    }

    async initContent() {
        // Comlink HelloWorld
        const instance = Comlink.wrap<HelloComlinkWorker>(new HelloComlinkWorker());
        console.log(`Counter: ${await instance.getCounter}`);
        await instance.inc();
        console.log(`Counter: ${await instance.counter}`);

        // Comlink Threads.js
        const auth = await spawn(new HelloThreadsWorker());
        const hashed = await auth.hashPassword('Super secret password', '1234');

        console.log('Hashed password:', hashed);

        await Thread.terminate(auth);
    }

    async initObjectBuffer() {
        const initialValue = {
            foo: { bar: new Date(), arr: [1], nesting: { WorksTM: true } }
        };
        // ArrayBuffer is created under the hood
        const myObject = createObjectBuffer(
            // size in bytes
            1024 * 1024,
            initialValue
        );

        myObject.additionalProp = 'new Value';
        myObject.foo.arr.push(2);

        const arrayBuffer = getUnderlyingArrayBuffer(myObject);
        console.log(arrayBuffer);
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

const app = new HelloPlayground(document.getElementById('example'));

window.addEventListener('resize', () => app.resizeDisplayGL(), false);

console.log('Starting initialisation phase...');
app.initContent();
app.initObjectBuffer();
app.resizeDisplayGL();

const requestRender = function() {
    requestAnimationFrame(requestRender);
    app.render();
};

requestRender();

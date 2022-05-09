# WorkerTaskDirector Core Library, Extensions for three.js, plus examples

**Important: The repo name is likely to change soon**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/three-wtm/blob/main/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/three-wtm)

# Overview

The Worker Task Director Core Library [wtd-core](./packages/wtd-core) directs the execution of different module workers. Each named module worker can be instantiated a configurable number of times as generic WorkerTask. Each WorkerTask can be executed with variying data in parallel. Execution is handled asynchronuously (Promises/await) on the main JavaScript thread and the execution itself is done in parallel in each worker.

`WorkerTaskManager` defines a execution workflow between the Main and each web worker. Workers require an execution function and an optional initialization function. The library ensures communication between Main and workers and it provides utility functions for proper Transferables handling. It provides interfaces and utility functions allowing to adapt existing workers to this workflow.

The orginal idea of a "TaskManager" was proposed by in Don McCurdy here [three.js issue 18234](https://github.com/mrdoob/three.js/issues/18234) It evolved via [three.js PR 19650](https://github.com/mrdoob/three.js/pull/19650) into this repository.
With version v2.0.0 the core library [wtd-core](./packages/wtd-core) and the three.js extensions [wtd-three-ext](./packages/wtd-three-ext) where separated into different npm packages.

# Features

- Package `wtd-core` has no dependencies. Additional functions for [three.js](https://threejs.org/) have been moved to the new package `wtd-three-ext` (***new in 2.0.0***) which requires three as dependency.
- `WorkerTaskDirector` supports standard and module workers to be loaded via URL. Standard workers can be loaded from a Blob as well. This is generally not supported for module workers.
- All worker code construction code and minification problem prevention code has been removed. Standard workers can be created/bundled from module workers with `Vite` if a browser without module worker support is a target.
- Dependency handling is realized via regular module import
- `WorkerTaskManager` has an execution queue allowing to queue more task than can be currently executed.
- The worker interface is specified by `WorkerTaskDirectorWorker` and is implemented by default by `WorkerTaskDirectorDefaultWorker`. Extending this class defines the easiest way to integrate a worker. (***new in 2.0.0***)
- The amount of workers that are created for each task can now be configured. This is shown in the [Potentially Infinite Example](./packages/examples/potentially_infinite.html) (***new in 2.0.0***). It feature transfer Mesh and Material (meta-information) bi-driectionally between Main and workers with proper handling of **Transferables**" are treated as such by **.
- All code has been transform to TypeScript (***new in 2.0.0***)
- [Vite](https://vitejs.dev/) is used for development and worker bundling / standard worker support (***new in 2.0.0***)


# Getting Started

There exist three possibilities:
* Press the `Gitpod` button above and start coding and using the examples directly in the browser
* Checkout the repository and use `docker-compose up -d` to spin up local snowpack dev server
* Checkout the repository and run `npm install`, `npm run build` and then `npm run dev` to spin up the local Vite dev server

Whatever environment you choose to start [Vite](https://vitejs.dev/) is used to serve the code and the examples using it. With this setup you are able to change the code and examples without invoking an additional bundler. Vite ensures all imported npm modules are available if previously installed in local environment (see `npm install`).

If you run Vite locally you require a `nodejs` and `npm`. The Gitpod and local docker environment ensure all prerequisites are fulfilled.

In any environment the dev server is reachable on port 8080.

# Main Branches

Main development takes place on branch [main](https://github.com/kaisalmen/three-wtm/tree/main).
<br>
The [stable](https://github.com/kaisalmen/three-wtm/tree/stable) branch contains the released versions.

# Examples

There are multiple examples available (listed from simple to complex):
- [Hello World](./packages/examples/helloWorld.html)
- [Hello World Standard Worker](./packages/examples/helloWorldStandard.html)
- [Transferables](./packages/examples/transferables.html)
- [Three.js Example](./packages/examples/threejs.html)
- [Potentially Infinite Example](./packages/examples/potentially_infinite.html)

This shall give you an idea how you can use module worker with `WorkerTaskManager` (also see [Hello World Example](./packages/examples/helloworld.html)). It is registered, initialized and execute once:
```javascript
const taskName = 'WorkerModule';

// register the module worker
this.workerTaskDirector.registerTask(taskName, {
    module: true,
    blob: false,
    url: new URL('../worker/HelloWorldWorker', import.meta.url)
});

// init the worker task without any payload (worker init without function invocation on worker)
this.workerTaskDirector.initTaskType(taskName)
    .then((x: unknown) => {
        // once the init Promise returns enqueue the execution
        const execMessage = new WorkerTaskMessage({
            id: 0,
            name: taskName
        });
        this.workerTaskDirector.enqueueWorkerExecutionPlan({
            taskTypeName: execMessage.name,
            message: execMessage,
            // decouple result evaluation ...
            onComplete: (m: WorkerTaskMessageType) => { console.log('Received final command: ' + m.cmd); }
        }).then((x: unknown) => {
            // ... promise result handling
            alert('Worker execution has been completed after.');
        });
    }).catch(
        // error handling
        (x: unknown) => console.error(x)
    );
```

# Docs
Run `npm run doc` to create the markdown documentation in directory **docs** of each package.

Happy coding!

Kai




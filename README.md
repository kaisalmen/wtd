# WorkerTaskDirector Core Library, Extensions for three.js and examples

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/three-wtm/blob/main/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/three-wtm)
[![wtd](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml/badge.svg)](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml)

# Overview

The Worker Task Director Core Library [wtd-core](./packages/wtd-core) directs the execution of registered workers. Each registerd worker can be instantiated a configurable number of times as generic WorkerTask. Each WorkerTask can be executed with variying data in parallel. Execution is handled asynchronuously on the main JavaScript thread and the execution itself is done in parallel in each worker.

The [WorkerTaskDirector](./packages/wtd-core/src/WorkerTaskDirector.ts) defines a [execution workflow](#execution-workflow) and ensures communication between Main and workers. **WorkerTaskDirector** uses a generic [WorkerTask](./packages/wtd-core/src/WorkerTask.ts) that handles the worker registration, initialization and execution. Additionally, [WorkerTaskMessage](./packages/wtd-core/src/WorkerTaskMessage.ts) defines basic message properties and with version 2.0.0+ it properly separates the message header and the payload. This [DataPayload](./packages/wtd-core/src/DataPayload.ts) provides functions to pack buffers into Transferables. It allows to define/extend "enhanced" payloads for [three.js](https://github.com/mrdoob/three.js). Basically, [wtd-three-ext](./packages/wtd-three-ext) now consists of specific Payload classes and some utility functions. Workers require an execution function and an optional initialization function. Interface [WorkerTaskDirectorWorker](./packages/wtd-core/src/WorkerTaskDirector.ts#L196) and the default implementation [WorkerTaskDirectorDefaultWorker](./packages/wtd-core/src/WorkerTaskDirector.ts#L206) provide simple means to define a worker.

The orginal idea of a "TaskManager" was proposed by in Don McCurdy here [three.js issue 18234](https://github.com/mrdoob/three.js/issues/18234) It evolved from [three.js PR 19650](https://github.com/mrdoob/three.js/pull/19650) into this repository.

With version v2.0.0 the core library [wtd-core](./packages/wtd-core) and the three.js extensions [wtd-three-ext](./packages/wtd-three-ext) were separated into different npm packages [wtd-core](https://www.npmjs.com/package/wtd-core) and [wtd-three-ext](https://www.npmjs.com/package/wtd-three-ext).

# Examples

There are multiple examples available (listed from simple to advanced):
- **Hello World: Module Worker**: [html](./packages/examples/helloWorld.html), [ts](./packages/examples/src/helloWorld/helloWorld.ts), [worker-ts](./packages/examples/src/worker/HelloWorldWorker.ts)
- **Hello World: Standard Worker**: [html](./packages/examples/helloWorldStandard.html), [ts](./packages/examples/src/helloWorld/helloWorldStandard.ts), [worker-js (generated)](./packages/examples/src/worker/generated/HelloWorldWorker-iife.js)
- **Hello World: WorkerTask Only**: [html](./packages/examples/helloWorldWorkerTask.html), [ts](./packages/examples/src/helloWorld/helloWorldWorkerTask.ts), [worker-ts](./packages/examples/src/worker/HelloWorldWorker.ts)
- **Transferables**: [html](./packages/examples/transferables.html), [ts](./packages/examples/src/transferables/TransferablesTestbed.ts), **Worker**: [1](./packages/examples/src/worker/TransferableWorkerTest1.ts), [2](./packages/examples/src/worker/TransferableWorkerTest2.ts), [3](./packages/examples/src/worker/TransferableWorkerTest3.ts), [4](./packages/examples/src/worker/TransferableWorkerTest4.ts)
- **Three.js Example**: [html](./packages/examples/threejs.html), [ts](./packages/examples/src/threejs/Threejs.ts), **Worker**: [1](./packages/examples/src/worker/HelloWorldThreeWorker.ts), [2](./packages/examples/src/worker/OBJLoaderWorker.ts)
- **Potentially Infinite Example**: [html](./packages/examples/potentially_infinite.html), [ts](./packages/examples/src/infinite/PotentiallyInfiniteExample.ts), **Worker**: [1](./packages/examples/src/worker/InfiniteWorkerExternalGeometry.ts), [2](./packages/examples/src/worker/InfiniteWorkerInternalGeometry.ts), [3](./packages/examples/src/worker/OBJLoader2Worker.js), [4](./packages/examples/src/infinite/PotentiallyInfiniteExample.ts#L591)

## Usage

This shall give you an idea how you can use module worker with `WorkerTaskDirector` (also see [Hello World Example](./packages/examples/src/helloWorld/helloworld.ts)). It is registered, initialized and execute once:
```javascript
const workerTaskDirector: WorkerTaskDirector = new WorkerTaskDirector();
const taskName = 'WorkerModule';

// register the module worker
workerTaskDirector.registerTask(taskName, {
    module: true,
    blob: false,
    url: new URL('./HelloWorldWorker.js', import.meta.url)
});

// init the worker task without any payload (worker init without function invocation on worker)
workerTaskDirector.initTaskType(taskName)
    .then((x: unknown) => {
        // once the init Promise returns enqueue the execution
        const execMessage = new WorkerTaskMessage({
            id: 0,
            name: taskName
        });
        workerTaskDirector.enqueueWorkerExecutionPlan({
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

# Getting Started

There exist three possibilities:
* Press the `Gitpod` button above and start coding and using the examples directly in the browser
* Checkout the repository and use `docker-compose up -d` to spin up local snowpack dev server
* Checkout the repository and run `npm install`, `npm run build` and then `npm run dev` to spin up the local Vite dev server

Whatever environment you choose to start [Vite](https://vitejs.dev/) is used to serve the code and the examples using it. With this setup you are able to change the code and examples without invoking an additional bundler. Vite ensures all imported npm modules are available if previously installed in local environment (see `npm install`).

If you run Vite locally you require a `nodejs` and `npm`. The Gitpod and local docker environment ensure all prerequisites are fulfilled.

In any environment the dev server is reachable on port 8080.

# Features

- Package `wtd-core` has no dependencies. Additional functions for [three.js](https://threejs.org/) have been moved to the new package `wtd-three-ext` (***new in 2.0.0***) which requires three as dependency.
- `WorkerTaskDirector` supports standard and module workers to be loaded via URL. Standard workers can be loaded from a Blob as well. This is generally not supported for module workers.
- All worker code construction code and minification problem prevention code has been removed. Standard workers can be created/bundled from module workers with `Vite` if a browser without module worker support is a target.
- Dependency handling is realized via regular module import
- `WorkerTaskDirector` has an execution queue allowing to queue more task than can be currently executed.
- The worker interface is specified by `WorkerTaskDirectorWorker` and is implemented by default by `WorkerTaskDirectorDefaultWorker`. Extending this class defines the easiest way to integrate a worker. (***new in 2.0.0***)
- The workers that are created for each task can now be configured. This is shown in the [Potentially Infinite Example](./packages/examples/src/infinite/PotentiallyInfiniteExample.ts) (***new in 2.0.0***). It features transfer Mesh and Material (meta-information) bi-driectionally between Main and workers with proper handling of **Transferables**" are treated as such by **.

# Execution Workflow

The following table describes the currently implemented execution workflow of `WorkerTaskManager`:

| WorkerTaskManager (function)  | Message cmd + direction   | Worker (function) | Comment
| ---                           | :---:                     | ---               | ---
| `registerTask`                |                           |                   |
| `initTaskType`                | **init ->**               | `init`            | User of `initTaskType` receives resolved promise after execution completion.<br>Sending `init` message is Optional
|                               | **<- initComplete**       |                   |
| `enqueueForExecution`         | **exec ->**               | `exec`            |
|                               | **<- intermediate**       |                   | Can be sent 0 to n times before **execComplete**
|                               | **<- execComplete**       |                   | User of `enqueueForExecution` receives resolved promise after execution completion.<br>Callbacks `onIntermediate` and `onComplete` are used to handle message+payload.


# Main Branches

Main development takes place on branch [main](https://github.com/kaisalmen/three-wtm/tree/main).
<br>
The [stable](https://github.com/kaisalmen/three-wtm/tree/stable) branch contains the released versions.

# Docs
Run `npm run doc` to create the markdown documentation in directory **docs** of each package.

Happy coding!

Kai




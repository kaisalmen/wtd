# WorkerTask, WorkerTaskDirector and three.js extensions

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/wtd/blob/main/LICENSE)
[![wtd](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml/badge.svg)](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml)
[![Github Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://kaisalmen.github.io/wtd)
[![wtd-core version](https://img.shields.io/npm/v/wtd-core?logo=npm&label=wtd-core)](https://www.npmjs.com/package/wtd-core)
[![wtd-three-ext version](https://img.shields.io/npm/v/wtd-three-ext?logo=npm&label=wtd-three-ext)](https://www.npmjs.com/package/wtd-three-ext)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/wtd)

Build applications with workers with less boiler plate code.

- [WorkerTask, WorkerTaskDirector and three.js extensions](#workertask-workertaskdirector-and-threejs-extensions)
  - [Overview](#overview)
  - [Examples](#examples)
    - [Usage](#usage)
  - [Getting Started](#getting-started)
  - [WorkerTaskDirector Execution Workflow](#workertaskdirector-execution-workflow)
  - [Main Branches](#main-branches)
  - [Docs](#docs)
  - [History](#history)

## Overview

- [wtd-core](https://www.npmjs.com/package/wtd-core) main features:
  - `WorkerTask`: Defines a non-mandatory (**New with v3**) lifecycle and message protocol (`WorkerTaskMessage`) with optional `Payload` for using and re-using workers. Either use `init` and `execute` funtions to follow a basic lifecycle or send various message either awaiting feedback or not. Use a `WorkerTaskWorker` to connect your ESM worker code with the communication routing. `WorkerTask` ensures aynchronous feedback reaches the caller.
  - `WorkerTaskManager`: Manages the execution of mutliple `WorkerTask` and multiple instances in parallel. It allows to queue tasks for later execution. This only works when the basic lifecycle is used.
  - **New with v3**: Helper functions for creating an OffscreenCanvas and delegating events to the worker. It provides a default configuration, but allows to customize all aspects of the configuration to your specific needs. This work was inspired by [three.js optimization manual](https://threejs.org/manual/#en/offscreencanvas)
- [wtd-three-ext](https://www.npmjs.com/package/wtd-three-ext) main features:
  - [three.js](https://github.com/mrdoob/three.js) related extension. It allows to define/extend "enhanced" payloads useful in the context of three.js (e.g. exchange Mesh or Material data).
  - **New with v3**: Extension to the OffscreenCanvas functions. It can trick the code running in the worker to think it has a real canvas allowing to re-use the exact same code. This work was also inspired by [three.js optimization manual](https://threejs.org/manual/#en/offscreencanvas)

## Examples

There are multiple examples available demonstarting the features described above (listed from simpler to more advanced):

- Using [wtd-core](https://www.npmjs.com/package/wtd-core) only:
  - **WorkerTask: Hello World**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/helloWorldWorkerTask.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/helloWorld/HelloWorldWorkerTask.ts), [worker](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/HelloWorldWorker.ts)
  - **WorkerTaskDirector: Hello World**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/helloWorldWorkerTaskDirector.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/helloWorld/helloWorldWorkerTaskDirector.ts), [worker](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/HelloWorldWorker.ts)
  - **WorkerTask: Inter-Worker Communication**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/workerCom.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/com/WorkerCom.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/Com1Worker.ts) and [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/Com2Worker.ts)
- Using [wtd-core](https://www.npmjs.com/package/wtd-core) and [wtd-three-ext](https://www.npmjs.com/package/wtd-three-ext):
  - **WorkerTaskDirector: Transferables**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/transferables.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/transferables/TransferablesTestbed.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest1.ts), [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest2.ts), [3](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest3.ts), [4](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest4.ts)
  - **WorkerTaskDirector: Three.js**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/threejs.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/threejs/Threejs.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/HelloWorldThreeWorker.ts), [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/OBJLoaderWorker.ts)
  - **WorkerTaskDirector: Potentially Infinite Execution**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/potentially_infinite.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/infinite/PotentiallyInfiniteExample.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/InfiniteWorkerExternalGeometry.ts), [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/InfiniteWorkerInternalGeometry.ts), [3](https://github.com/kaisalmen/WWOBJLoader/blob/main/packages/objloader2/src/worker/OBJLoader2Worker.ts), [4](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/infinite/PotentiallyInfiniteExample.ts#L627-L668)

Try out all examples here: <https://kaisalmen.github.io/wtd>

### Usage

This shall give you an idea how you can use module worker with `WorkerTask` (derived from [WorkerTask: Hello World](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/helloWorld/HelloWorldWorkerTask.ts)):

```js
// let WorkerTask create the worker
const workerTask = new WorkerTask({
    taskName,
    workerId: 1,
    workerConfig: {
        $type: 'WorkerConfigParams',
        url: new URL('./HelloWorldWorker.js', import.meta.url),
        workerType: 'module',
    },
    verbose: true
});

try {
    // creates and connects the worker callback functions and the WorkerTask
    workerTask.connect();

    // execute without init and an empty message
    const resultExec = await workerTask.executeWorker({
        message: WorkerTaskMessage.createEmpty()
    });

    // once you awaited the resulting WorkerTaskMessage extract the RawPayload
    const rawPayload = resultExec.payloads?.[0] as RawPayload;

    // log the hello from the HelloWorldWorker
    console.log(`Worker said: ${rawPayload.message.raw?.hello}`);
} catch (e) {
    // error handling
    console.error(e);
}
```

## Getting Started

There exist three possibilities:

- Checkout the repository and run the following to spin up the local Vite dev server:

```shell
npm install
npm run build
npm run dev
```

- Press the `Gitpod` button above and start coding and using the examples directly in the browser
- Checkout the repository and use `docker-compose up -d` to spin up local Vite dev server

Whatever environment you choose to start [Vite](https://vitejs.dev/) is used to serve the code and the examples using it. With this setup you are able to change the code and examples without invoking an additional bundler. Vite ensures all imported npm modules are available if previously installed in local environment (see `npm install`).

If you run Vite locally you require a `nodejs` and `npm`. The Gitpod and local docker environment ensure all prerequisites are fulfilled.

In any environment the dev server is reachable on port 23001.

## WorkerTaskDirector Execution Workflow

The following table describes the currently implemented execution workflow of `WorkerTaskDirector`:

| WorkerTaskDirector (function)  | Message cmd + direction   | Worker (function) | Comment
| ---                           | :---:                     | ---               | ---
| `registerTask`                |                           |                   |
| `initTaskType`                | **init ->**               | `init`            | User of `initTaskType` receives resolved promise after execution completion.<br>
Sending `init` message is Optional
|                               | **<- initComplete**       |                   |
| `enqueueForExecution`         | **exec ->**               | `exec`            |
|                               | **<- intermediate**       |                   | Can be sent 0 to n times before **execComplete**
|                               | **<- execComplete**       |                   | User of `enqueueForExecution` receives resolved promise after execution completion.<br>
Callbacks `onIntermediate` and `onComplete` are used to handle message+payload.

## Main Branches

Main development takes place on branch [main](https://github.com/kaisalmen/wtd/tree/main).

## Docs

Run `npm run doc` to create the markdown documentation in directory **docs** of each package.

## History

The orginal idea of a "TaskManager" was proposed by in Don McCurdy here [three.js issue 18234](https://github.com/mrdoob/three.js/issues/18234) It evolved from [three.js PR 19650](https://github.com/mrdoob/three.js/pull/19650) into this repository.

With version v2.0.0 the core library [wtd-core](https://github.com/kaisalmen/wtd/blob/main/packages/wtd-core) and the three.js extensions [wtd-three-ext](https://github.com/kaisalmen/wtd/blob/main/packages/wtd-three-ext) were separated into different npm packages [wtd-core](https://www.npmjs.com/package/wtd-core) and [wtd-three-ext](https://www.npmjs.com/package/wtd-three-ext).

Happy coding!

Kai

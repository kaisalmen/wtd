# Worker Task Director Three.js Extenstions (wtd-three-ext)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/wtd/blob/main/LICENSE)
[![wtd](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml/badge.svg)](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml)
[![Github Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://kaisalmen.github.io/wtd)
[![wtd-three-ext version](https://img.shields.io/npm/v/wtd-three-ext?logo=npm&label=wtd-three-ext)](https://www.npmjs.com/package/wtd-three-ext)

three.js related extensions of [wtd-core](https://www.npmjs.com/package/wtd-core) and additional three.js related utility functions.

- [Worker Task Director Three.js Extenstions (wtd-three-ext)](#worker-task-director-threejs-extenstions-wtd-three-ext)
  - [Examples](#examples)
  - [Usage](#usage)

## Examples

There are multiple examples available demonstarting the features described above (listed from simpler to more advanced):

- **WorkerTaskDirector: Transferables**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/transferables.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/transferables/TransferablesTestbed.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest1.ts), [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest2.ts), [3](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest3.ts), [4](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/TransferableWorkerTest4.ts)
- **WorkerTaskDirector: Three.js**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/threejs.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/threejs/Threejs.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/HelloWorldThreeWorker.ts), [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/OBJLoaderWorker.ts)
- **WorkerTaskDirector: Potentially Infinite Execution**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/potentially_infinite.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/infinite/PotentiallyInfiniteExample.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/InfiniteWorkerExternalGeometry.ts), [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/InfiniteWorkerInternalGeometry.ts), [3](https://github.com/kaisalmen/WWOBJLoader/blob/main/packages/objloader2/src/worker/OBJLoader2Worker.ts), [4](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/infinite/PotentiallyInfiniteExample.ts#L627-L668)

Try out all examples here: <https://kaisalmen.github.io/wtd>

## Usage

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
    // cteates and connects the worker callback functions and the WorkerTask
    workerTask.connectWorker();

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

Also refer to the full [README.md](https://github.com/kaisalmen/wtd/blob/main/README.md) in main [repository](https://github.com/kaisalmen/wtd).

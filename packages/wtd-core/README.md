# Worker Task Director Library (wtd-core)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/wtd/blob/main/LICENSE)
[![wtd](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml/badge.svg)](https://github.com/kaisalmen/wtd/actions/workflows/actions.yml)
[![Github Pages](https://img.shields.io/badge/GitHub-Pages-blue?logo=github)](https://kaisalmen.github.io/wtd)
[![wtd-core version](https://img.shields.io/npm/v/wtd-core?logo=npm&label=wtd-three-ext)](https://www.npmjs.com/package/wtd-core)

Build applications with workers with less boiler plate code.

- [Worker Task Director Library (wtd-core)](#worker-task-director-library-wtd-core)
  - [Examples](#examples)
  - [Usage](#usage)

## Examples

There are multiple examples available demonstarting the features described above (listed from simpler to more advanced):

- **WorkerTask: Hello World**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/helloWorldWorkerTask.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/helloWorld/HelloWorldWorkerTask.ts), [worker](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/HelloWorldWorker.ts)
- **WorkerTaskDirector: Hello World**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/helloWorldWorkerTaskDirector.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/helloWorld/helloWorldWorkerTaskDirector.ts), [worker](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/HelloWorldWorker.ts)
- **WorkerTask: Inter-Worker Communication**: [html](https://github.com/kaisalmen/wtd/blob/main/packages/examples/workerCom.html), [ts](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/com/WorkerCom.ts), **Worker**: [1](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/Com1Worker.ts) and [2](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/worker/Com2Worker.ts)

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

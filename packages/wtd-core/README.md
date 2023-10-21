# Worker Task Director Library (wtd-core)

Worker Task Director Core Library.

Please refer to the full [README.md](../../README.md) in main [repository](https://github.com/kaisalmen/wtd).

## Usage

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
try {
    await workerTaskDirector.initTaskType(taskName)
    // once the init Promise returns enqueue the execution
    const execMessage = new WorkerTaskMessage();

    await workerTaskDirector.enqueueWorkerExecutionPlan(taskName, {
        message: execMessage,
        // decouple result evaluation ...
        onComplete: (m: WorkerTaskMessageType) => { console.log('Received final command: ' + m.cmd); }
    });
    // ... promise result handling
    alert('Worker execution has been completed after.');
} catch (e) {
    // error handling
    console.error(e);
}
```

## Examples

**wtd-core** related examples are found here:

- **Hello World: Module Worker**: [html](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/helloWorld.html), [ts](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/src/helloWorld/HelloWorld.ts), [worker-ts](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/src/worker/HelloWorldWorker.ts)
- **Hello World: Standard Worker**: [html](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/helloWorldStandard.html), [ts](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/src/helloWorld/HelloWorldStandard.ts), [worker-ts](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/src/worker/HelloWorldWorker.ts)
- **Hello World: WorkerTask Only**: [html](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/helloWorldWorkerTask.html), [ts](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/src/helloWorld/HelloWorldWorkerTask.ts), [worker-ts](https://github.com/kaisalmen/wtd/blob/HEAD/packages/examples/src/worker/HelloWorldWorker.ts)

More advanced examples utilizing the extension package [wtd-three-ext](https://www.npmjs.com/package/wtd-three-ext) as well are linked there or in the main [README.md](../../README.md).

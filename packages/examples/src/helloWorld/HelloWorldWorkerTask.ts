import {
    WorkerTask,
    WorkerTaskMessage,
    WorkerTaskMessageType,
    unpack
} from 'wtd-core';

/**
 * Hello World example just using the WorkerTask directly without the WorkerTaskDirector
 */
class HelloWorldWorkerTaskExample {

    async run() {
        const taskName = 'HelloWorldTaskWorker';

        const workerTask = new WorkerTask(taskName, 1, {
            module: true,
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/HelloWorldWorker.ts' : '../worker/generated/HelloWorldWorker-es.js', import.meta.url)
        }, true);

        const initMessage = new WorkerTaskMessage();

        try {
            // init the worker task without any payload (worker init without function invocation on worker)
            const resultInit = await workerTask.initWorker(initMessage);
            console.log(`initTaskType then: ${resultInit}`);

            const t0 = performance.now();
            // once the init Promise is done enqueue the execution
            const execMessage = new WorkerTaskMessage();
            const resultExec = await workerTask.executeWorker({
                message: execMessage,
                // decouple result evaluation ...
                onComplete: (m: WorkerTaskMessageType) => {
                    const wtm = unpack(m, false);
                    console.log(wtm);
                    if (wtm.payloads.length === 1) {
                        console.log(wtm.payloads[0]);
                    }
                    console.log('Received final command: ' + wtm.cmd);
                }
            });
            // ... promise result handling
            console.log(`enqueueWorkerExecutionPlan then: ${resultExec}`);
            const t1 = performance.now();
            const msg = `Worker execution has been completed after ${t1 - t0}ms.`;
            console.log(msg);
            alert(msg);
            console.log('Done');
        } catch (e) {
            console.error(e);
        }
    }
}

const app = new HelloWorldWorkerTaskExample();
app.run();

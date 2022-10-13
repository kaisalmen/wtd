import {
    WorkerTask,
    WorkerTaskMessage,
    WorkerTaskMessageType
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

        const initMessage = new WorkerTaskMessage({
            cmd: 'init',
            id: 0,
            name: taskName
        });

        // init the worker task without any payload (worker init without function invocation on worker)
        await workerTask.initWorker(initMessage)
            .then((x: unknown) => {
                console.log(`initTaskType then: ${(x as MessageEvent).data.cmd}`);
            }).catch(
                // error handling
                (x: unknown) => console.error(x)
            );

        const t0 = performance.now();
        // once the init Promise returns enqueue the execution
        const execMessage = new WorkerTaskMessage({
            id: 0,
            name: taskName
        });
        await workerTask.executeWorker({
            taskTypeName: execMessage.name,
            message: execMessage,
            // decouple result evaluation ...
            onComplete: (m: WorkerTaskMessageType) => {
                const wtm = WorkerTaskMessage.unpack(m, false);
                console.log(wtm);
                if (wtm.payloads.length === 1) {
                    console.log(wtm.payloads[0]);
                }
                console.log('Received final command: ' + wtm.cmd);
            }
        }).then((x: unknown) => {
            // ... promise result handling
            console.log(`enqueueWorkerExecutionPlan then: ${x}`);
            const t1 = performance.now();
            const msg = `Worker execution has been completed after ${t1 - t0}ms.`;
            console.log(msg);
            alert(msg);
        }).catch(
            // error handling
            (x: unknown) => console.error(x)
        );
        console.log('Done');
    }
}

const app = new HelloWorldWorkerTaskExample();
app.run();

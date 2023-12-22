import {
    RawPayload,
    WorkerTask,
    WorkerTaskMessage
} from 'wtd-core';

/**
 * Hello World example just using the WorkerTask directly without the WorkerTaskDirector
 */
class HelloWorldWorkerTaskExample {

    async run() {
        const url = new URL(import.meta.env.DEV ? '../worker/HelloWorldWorker.ts' : '../worker/generated/HelloWorldWorker-es.js', import.meta.url);
        const workerTask = new WorkerTask({
            taskName: 'HelloWorldWorker',
            workerId: 1,
            workerConfig: {
                $type: 'WorkerConfigParams',
                url,
                workerType: 'module',
            },
            verbose: true
        });

        try {
            // connects the worker callback functions and the WorkerTask
            workerTask.connectWorker();

            const t0 = performance.now();
            // execute without init
            const resultExec = await workerTask.executeWorker({
                message: WorkerTaskMessage.createEmpty()
            });

            const rawPayload = resultExec.payloads?.[0] as RawPayload;
            const answer = `Worker said: ${rawPayload.message.raw?.hello}`;
            const t1 = performance.now();

            const msg = `${answer}\nWorker execution has been completed after ${t1 - t0}ms.`;
            console.log(msg);
            alert(msg);
        } catch (e) {
            console.error(e);
        }
    }
}

const app = new HelloWorldWorkerTaskExample();
app.run();

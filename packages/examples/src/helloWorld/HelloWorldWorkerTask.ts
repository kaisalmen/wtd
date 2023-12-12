import {
    DataPayload,
    WorkerTask,
    WorkerTaskMessage
} from 'wtd-core';

/**
 * Hello World example just using the WorkerTask directly without the WorkerTaskDirector
 */
class HelloWorldWorkerTaskExample {

    async run() {
        const taskName = 'HelloWorldTaskWorker';

        const workerUrl = new URL(import.meta.env.DEV ? '../worker/HelloWorldWorker.ts' : '../worker/generated/HelloWorldWorker-es.js', import.meta.url);
        const worker = new Worker(workerUrl, {
            type: 'module'
        });
        const workerTask = new WorkerTask({
            taskName,
            workerId: 1,
            workerConfig: {
                $type: 'WorkerConfigDirect',
                worker
            },
            verbose: true
        });

        try {
            workerTask.createWorker();

            const t0 = performance.now();
            // once the init Promise is done enqueue the execution
            const execMessage = WorkerTaskMessage.createEmpty();
            const resultExec = await workerTask.executeWorker({
                message: execMessage
            });

            const wtm = WorkerTaskMessage.unpack(resultExec, false);
            if (wtm.payloads?.length === 1) {
                const dataPayload = wtm.payloads[0] as DataPayload;
                console.log(`Worker said: ${dataPayload.message?.params?.hello}`);
            }
            console.log('Received final command: ' + wtm.cmd);

            const t1 = performance.now();
            const msg = `Worker execution has been completed after ${t1 - t0}ms.`;
            console.log(msg);
            alert(msg);
        } catch (e) {
            console.error(e);
        }
    }
}

const app = new HelloWorldWorkerTaskExample();
app.run();

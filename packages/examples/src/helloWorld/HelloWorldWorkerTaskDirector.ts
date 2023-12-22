import {
    RawPayload,
    WorkerTaskDirector,
    WorkerTaskMessage
} from 'wtd-core';

/**
 * Hello World example using a module worker
 */
class HelloWorldModuleWorkerExample {

    private workerTaskDirector: WorkerTaskDirector = new WorkerTaskDirector({
        defaultMaxParallelExecutions: 1,
        verbose: true
    });

    async run() {
        const taskName = 'HelloWorldWorker';

        // register the module worker
        this.workerTaskDirector.registerTask({
            taskName,
            workerConfig: {
                $type: 'WorkerConfigParams',
                workerType: 'module',
                blob: false,
                url: new URL(import.meta.env.DEV ? '../worker/HelloWorldWorker.ts' : '../worker/generated/HelloWorldWorker-es.js', import.meta.url),

            }
        });

        try {
            // init the director without any payload (worker init without function invocation on worker)
            await this.workerTaskDirector.initTaskType(taskName);

            // execute worker without init
            const t0 = performance.now();
            const resultExec = await this.workerTaskDirector.enqueueForExecution(taskName, {
                message: WorkerTaskMessage.createEmpty(),
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

const app = new HelloWorldModuleWorkerExample();
app.run();

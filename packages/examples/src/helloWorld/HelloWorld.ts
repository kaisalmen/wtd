import {
    DataPayload,
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
        const taskName = 'WorkerModule';

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
                message: new WorkerTaskMessage(),
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

const app = new HelloWorldModuleWorkerExample();
app.run();

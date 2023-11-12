import {
    WorkerTaskDirector,
    WorkerTaskMessage,
    WorkerTaskMessageConfig
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
        this.workerTaskDirector.registerTask(taskName, {
            module: true,
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/HelloWorldWorker.ts' : '../worker/generated/HelloWorldWorker-es.js', import.meta.url)
        });

        try {
            // init the worker task without any payload (worker init without function invocation on worker)
            const resultInit = await this.workerTaskDirector.initTaskType(taskName);
            console.log(`initTaskType then: ${resultInit[0]}`);

            const t0 = performance.now();
            // once the init Promise returns enqueue the execution
            const execMessage = new WorkerTaskMessage();
            const resultExec = await this.workerTaskDirector.enqueueWorkerExecutionPlan(taskName, {
                message: execMessage,
                // decouple result evaluation ...
                onComplete: (m: WorkerTaskMessageConfig) => {
                    const wtm = WorkerTaskMessage.unpack(m, false);
                    console.log(wtm);
                    if (wtm.payloads?.length === 1) {
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

const app = new HelloWorldModuleWorkerExample();
app.run();

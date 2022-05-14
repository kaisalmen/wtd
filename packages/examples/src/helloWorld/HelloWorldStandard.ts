import {
    WorkerTaskDirector,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';

/**
 * Hello World example showing standard and module worker using three
 */
class HelloWorldStandardWorkerExample {

    private workerTaskDirector: WorkerTaskDirector = new WorkerTaskDirector({
        defaultMaxParallelExecutions: 1,
        verbose: true
    });

    async run() {
        let t0: number;
        let t1: number;
        const taskName = 'WorkerModuleStandard';

        // register the standard worker
        this.workerTaskDirector.registerTask(taskName, {
            module: false,
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/generated/HelloWorldWorker-iife.js' : '../worker/generated/HelloWorldWorker-iife.js', import.meta.url)
        });

        // init the worker task without any payload (worker init without function invocation on worker)
        this.workerTaskDirector.initTaskType(taskName)
            .then((x: unknown) => {
                console.log(`initTaskType then: ${x}`);
                t0 = performance.now();

                // once the init Promise returns enqueue the execution
                const execMessage = new WorkerTaskMessage({
                    id: 0,
                    name: taskName
                });
                this.workerTaskDirector.enqueueWorkerExecutionPlan({
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
                    t1 = performance.now();
                    alert(`Worker execution has been completed after ${t1 - t0}ms.`);
                });
            }).catch(
                // error handling
                (x: unknown) => console.error(x)
            );
    }
}

const app = new HelloWorldStandardWorkerExample();
app.run();

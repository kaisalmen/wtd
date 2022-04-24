import {
    PayloadType,
    WorkerTaskDirector,
    DataTransportPayload
} from 'wtd-core';

/**
 * Hello World example showing standard and module worker using three
 */
class WorkerTaskDirectorHelloWorldExample {

    private workerTaskDirector: WorkerTaskDirector = new WorkerTaskDirector(1).setVerbose(true);

    async run() {
        let t0: number;
        let t1: number;

        // define input payload used for init and execte
        const moduleWorkerPayload = new DataTransportPayload('init', 0, 'WorkerModule');

        // register the module worker
        this.workerTaskDirector.registerTask(moduleWorkerPayload.name, {
            module: true,
            blob: false,
            url: new URL('../worker/helloWorldWorker', import.meta.url)
        });

        // init the worker task with the data from workerModulePayload
        this.workerTaskDirector.initTaskType(moduleWorkerPayload.name, moduleWorkerPayload)
            .then(() => {
                t0 = performance.now();

                // once the init Promise returns enqueue the execution
                this.workerTaskDirector.enqueueWorkerExecutionPlan({
                    taskTypeName: moduleWorkerPayload.name,
                    payload: moduleWorkerPayload,
                    // decouple result evaluation ...
                    onComplete: (e: unknown) => { console.log('Received final command: ' + (e as PayloadType).cmd); }
                });
            }).then(() => {
                // ... from promise result handling
                t1 = performance.now();
                alert(`Worker execution has been completed after ${t1 - t0}ms.`);
            }).catch((x: unknown) => console.error(x));
    }
}

const app = new WorkerTaskDirectorHelloWorldExample();
app.run();

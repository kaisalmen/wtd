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
        const standardWorkerPayload = new DataTransportPayload('init', 0, 'WorkerModuleStandard');

        // register the standard worker
        this.workerTaskDirector.registerTask(standardWorkerPayload.name, {
            module: false,
            blob: false,
            url: new URL('../worker/volatile/helloWorldWorkerStandard', import.meta.url)
        });

        // init the worker task with the data from standardWorkerPayload
        this.workerTaskDirector.initTaskType(standardWorkerPayload.name, standardWorkerPayload)
            .then(() => {
                t0 = performance.now();

                // once the init Promise returns enqueue the execution
                this.workerTaskDirector.enqueueWorkerExecutionPlan({
                    taskTypeName: standardWorkerPayload.name,
                    payload: standardWorkerPayload,
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

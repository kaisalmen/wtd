import {
    RawPayload,
    WorkerTask,
    WorkerTaskMessage,
    WorkerTaskMessageConfig,
    initChannel,
    initOffscreenCanvas
} from 'wtd-core';
import { recalcAspectRatio, updateText } from '../worker/ComWorkerCommon.js';

/**
 * Hello World example using a classic worker
 */
class HelloWorldStandardWorkerExample {

    private canvasMain: HTMLCanvasElement;
    private canvasCom1: HTMLCanvasElement;
    private canvasCom2: HTMLCanvasElement;

    constructor() {
        this.canvasMain = document.getElementById('main') as HTMLCanvasElement;
        this.canvasCom1 = document.getElementById('com1') as HTMLCanvasElement;
        this.canvasCom2 = document.getElementById('com2') as HTMLCanvasElement;

        recalcAspectRatio(this.canvasMain);
        recalcAspectRatio(this.canvasCom1);
        recalcAspectRatio(this.canvasCom2);

        updateText({
            text: 'Main: Init',
            width: this.canvasMain?.clientWidth ?? 0,
            height: this.canvasMain?.clientHeight ?? 0,
            canvas: this.canvasMain,
            log: true
        });
    }

    async run() {
        const com1Worker = new Worker(new URL(import.meta.env.DEV ? '../worker/Com1Worker.ts' : '../worker/generated/Com1Worker-es.js', import.meta.url), {
            type: 'module'
        });
        const workerTaskCom1 = new WorkerTask('Com1Worker', 1, {
            $type: 'WorkerConfigDirect',
            worker: com1Worker
        });

        const com2Worker = new Worker(new URL(import.meta.env.DEV ? '../worker/Com2Worker.ts' : '../worker/generated/Com2Worker-es.js', import.meta.url), {
            type: 'module'
        });
        const workerTaskCom2 = new WorkerTask('Com2Worker', 1, {
            $type: 'WorkerConfigDirect',
            worker: com2Worker
        });

        workerTaskCom1.createWorker();
        workerTaskCom2.createWorker();

        try {
            initChannel(workerTaskCom1, workerTaskCom2);
            initOffscreenCanvas(workerTaskCom1, this.canvasCom1);
            initOffscreenCanvas(workerTaskCom2, this.canvasCom2);

            const promisesinit = [];
            promisesinit.push(workerTaskCom1.initWorker({
                message: WorkerTaskMessage.createEmpty()
            }));
            promisesinit.push(workerTaskCom2.initWorker({
                message: WorkerTaskMessage.createEmpty()
            }));
            const results = await Promise.all(promisesinit) as MessageEvent[];
            const logMsg: string[] = [];
            results.forEach(message => {
                const rawPayload = message.data.payloads?.[0] as RawPayload;
                logMsg.push(` Worker init feedback: ${rawPayload.message.raw.hello}`);
            });
            console.log(`Init results:${logMsg}`);

            const t0 = performance.now();

            const onComplete = (message: WorkerTaskMessageConfig) => {
                console.log('Received final command: ' + message.cmd);
                if (message.payloads) {
                    const rawPayload = message.payloads[0] as RawPayload;
                    console.log(`Worker said onComplete: ${rawPayload.message.raw.finished} `);
                }
            };

            const promisesExec: Array<Promise<unknown>> = [];
            setTimeout(async () => {
                promisesExec.push(workerTaskCom1.executeWorker({
                    message: new WorkerTaskMessage(),
                    onComplete
                }));
                promisesExec.push(workerTaskCom2.executeWorker({
                    message: new WorkerTaskMessage(),
                    onComplete
                }));

                const result = await Promise.all(promisesExec);
                console.log(`Overall result: ${result} `);

                const t1 = performance.now();
                const text = `Main: Worker execution has been completed after ${t1 - t0} ms.`;
                updateText({
                    text,
                    width: this.canvasMain?.clientWidth ?? 0,
                    height: this.canvasMain?.clientHeight ?? 0,
                    canvas: this.canvasMain,
                    log: true
                });
                console.log('Done');
            }, 2000);
        } catch (e) {
            console.error(e);
        }
    }
}

const app = new HelloWorldStandardWorkerExample();
await app.run();

import {
    RawPayload,
    WorkerTask,
    WorkerTaskMessage,
    initChannel,
    initOffscreenCanvas,
    recalcAspectRatio,
    registerResizeHandler
} from 'wtd-core';
import { updateText } from '../worker/ComWorkerCommon.js';

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

        recalcAspectRatio(this.canvasMain, this.canvasMain.clientWidth, this.canvasMain.clientHeight);
        recalcAspectRatio(this.canvasCom1, this.canvasCom1.clientWidth, this.canvasCom1.clientHeight);
        recalcAspectRatio(this.canvasCom2, this.canvasCom2.clientWidth, this.canvasCom2.clientHeight);
    }

    async run() {
        const com1Worker = new Worker(new URL(import.meta.env.DEV ? '../worker/Com1Worker.ts' : '../worker/generated/Com1Worker-es.js', import.meta.url), {
            type: 'module'
        });
        const workerTaskCom1 = new WorkerTask({
            taskName: 'Com1Worker',
            workerId: 1,
            workerConfig: {
                $type: 'WorkerConfigDirect',
                worker: com1Worker
            },
            verbose: true
        });

        const com2Worker = new Worker(new URL(import.meta.env.DEV ? '../worker/Com2Worker.ts' : '../worker/generated/Com2Worker-es.js', import.meta.url), {
            type: 'module'
        });
        const workerTaskCom2 = new WorkerTask({
            taskName: 'Com2Worker',
            workerId: 2,
            workerConfig: {
                $type: 'WorkerConfigDirect',
                worker: com2Worker
            },
            verbose: true
        });

        workerTaskCom1.createWorker();
        workerTaskCom2.createWorker();

        try {
            await initChannel(workerTaskCom1, workerTaskCom2);

            let promises = [];
            promises.push(initOffscreenCanvas(workerTaskCom1, this.canvasCom1));
            promises.push(initOffscreenCanvas(workerTaskCom2, this.canvasCom2));
            await Promise.all(promises);

            registerResizeHandler(workerTaskCom1, this.canvasCom1);
            registerResizeHandler(workerTaskCom2, this.canvasCom2);

            updateText({
                text: 'Main: Init',
                width: this.canvasMain?.clientWidth ?? 0,
                height: this.canvasMain?.clientHeight ?? 0,
                canvas: this.canvasMain,
                log: true
            });

            promises = [];
            promises.push(workerTaskCom1.initWorker({
                message: WorkerTaskMessage.createEmpty()
            }));
            promises.push(workerTaskCom2.initWorker({
                message: WorkerTaskMessage.createEmpty()
            }));
            const results = await Promise.all(promises);
            const logMsg: string[] = [];
            results.forEach(wtm => {
                const rawPayload = wtm.payloads?.[0] as RawPayload;
                logMsg.push(` Worker init feedback: ${rawPayload.message.raw.hello}`);
            });
            console.log(`Init results:${logMsg}`);

            const t0 = performance.now();
            setTimeout(async () => {
                promises = [];
                promises.push(workerTaskCom1.executeWorker({
                    message: WorkerTaskMessage.createEmpty()
                }));
                promises.push(workerTaskCom2.executeWorker({
                    message: WorkerTaskMessage.createEmpty()
                }));

                const results = await Promise.all(promises);
                results.forEach((message: WorkerTaskMessage) => {
                    console.log('Received final command: ' + message.cmd);
                    if (message.payloads) {
                        const rawPayload = message.payloads[0] as RawPayload;
                        console.log(`Worker said onComplete: ${rawPayload.message.raw.finished} `);
                    }
                });

                const t1 = performance.now();
                const text = `Main: Worker execution has been completed after ${t1 - t0} ms.`;
                updateText({
                    text,
                    width: this.canvasMain?.clientWidth ?? 0,
                    height: this.canvasMain?.clientHeight ?? 0,
                    canvas: this.canvasMain,
                    log: true
                });
                workerTaskCom1.printAwaitAnswers();
                workerTaskCom2.printAwaitAnswers();
                console.log('Done');
            }, 2000);
        } catch (e) {
            console.error(e);
        }
    }
}

const app = new HelloWorldStandardWorkerExample();
await app.run();

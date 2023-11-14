import {
    RawPayload,
    WorkerTask,
    WorkerTaskMessage,
    WorkerTaskMessageConfig
} from 'wtd-core';
import { recalcAspectRatio, updateText } from '../worker/ComWorkerCommon.js';
import { OffscreenPayload } from 'wtd-core';

/**
 * Hello World example using a classic worker
 */
class HelloWorldStandardWorkerExample {

    private workerTaskCom1: WorkerTask;
    private workerTaskCom2: WorkerTask;
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

        this.workerTaskCom1 = new WorkerTask('Com1Worker', 1, {
            $type: 'WorkerConfigParams',
            workerType: 'module',
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/Com1Worker.ts' : '../worker/generated/Com1Worker-es.js', import.meta.url)
        });
        this.workerTaskCom2 = new WorkerTask('Com2Worker', 1, {
            $type: 'WorkerConfigParams',
            workerType: 'module',
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/Com2Worker.ts' : '../worker/generated/Com2Worker-es.js', import.meta.url)
        });
    }

    async run() {
        const channel = new MessageChannel();

        try {
            const offscreenCom1 = this.canvasCom1.transferControlToOffscreen();
            const offscreenPayload1 = new OffscreenPayload({
                event: {
                    type: 'init',
                    drawingSurface: offscreenCom1,
                    width: this.canvasCom1.clientWidth,
                    height: this.canvasCom1.clientHeight
                }
            });
            const payload1 = new RawPayload({
                port: channel.port1
            });

            const offscreenCom2 = this.canvasCom2.transferControlToOffscreen();
            const offscreenPayload2 = new OffscreenPayload({
                event: {
                    type: 'init',
                    drawingSurface: offscreenCom2,
                    width: this.canvasCom2.clientWidth,
                    height: this.canvasCom2.clientHeight
                }
            });
            const payload2 = new RawPayload({
                port: channel.port2
            });
            const promisesinit = [];
            promisesinit.push(this.workerTaskCom1.initWorker({
                message: WorkerTaskMessage.fromPayload([offscreenPayload1, payload1]),
                transferables: [channel.port1, offscreenCom1]
            }));
            promisesinit.push(this.workerTaskCom2.initWorker({
                message: WorkerTaskMessage.fromPayload([offscreenPayload2, payload2]),
                transferables: [channel.port2, offscreenCom2],
            }));
            await Promise.all(promisesinit);

            const t0 = performance.now();

            const onComplete = (message: WorkerTaskMessageConfig) => {
                console.log('Received final command: ' + message.cmd);
                if (message.payloads) {
                    const rawPayload = message.payloads[0] as RawPayload;
                    console.log(`Worker said onComplete: ${rawPayload.message.raw.finished}`);
                }
            };

            const promisesExec: Array<Promise<unknown>> = [];
            setTimeout(async () => {
                promisesExec.push(this.workerTaskCom1.executeWorker({
                    message: new WorkerTaskMessage(),
                    onComplete
                }));
                promisesExec.push(this.workerTaskCom2.executeWorker({
                    message: new WorkerTaskMessage(),
                    onComplete
                }));

                const result = await Promise.all(promisesExec);
                console.log(`Overall result: ${result}`);

                const t1 = performance.now();
                const text = `Main: Worker execution has been completed after ${t1 - t0}ms.`;
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

import {
    RawPayload,
    WorkerTask,
    WorkerTaskMessage,
    WorkerTaskMessageType
} from 'wtd-core';

/**
 * Hello World example using a classic worker
 */
class HelloWorldStandardWorkerExample {

    async run() {
        const workerTaskCom1 = new WorkerTask('Com1Worker', 1, {
            module: true,
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/Com1Worker.ts' : '../worker/generated/Com1Worker-es.js', import.meta.url)
        });
        const workerTaskCom2 = new WorkerTask('Com2Worker', 1, {
            module: true,
            blob: false,
            url: new URL(import.meta.env.DEV ? '../worker/Com2Worker.ts' : '../worker/generated/Com2Worker-es.js', import.meta.url)
        });

        try {
            const channel = new MessageChannel();

            const initCom1 = new WorkerTaskMessage();
            const payload1 = new RawPayload();
            payload1.message.raw = { port: channel.port1 };
            initCom1.addPayload(payload1);

            const initCom2 = new WorkerTaskMessage();
            const payload2 = new RawPayload();
            payload2.message.raw = { port: channel.port2 };
            initCom2.addPayload(payload2);

            const promisesinit = [];
            promisesinit.push(workerTaskCom1.initWorker({
                message: initCom1,
                transferables: [channel.port1]
            }));
            promisesinit.push(workerTaskCom2.initWorker({
                message: initCom2,
                transferables: [channel.port2],
            }));
            await Promise.all(promisesinit);

            const t0 = performance.now();

            const onComplete = (message: WorkerTaskMessageType) => {
                console.log('Received final command: ' + message.cmd);
                const rawPayload = message.payloads[0] as RawPayload;
                console.log(`Worker said onComplete: ${rawPayload.message.raw.finished}`);
            };

            const promisesExec = [];
            promisesExec.push(workerTaskCom1.executeWorker({
                message: new WorkerTaskMessage(),
                onComplete
            }));
            promisesExec.push(workerTaskCom2.executeWorker({
                message: new WorkerTaskMessage(),
                onComplete
            }));

            const result = await Promise.all(promisesExec);
            console.log(`Overall result: ${result}`);

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

const app = new HelloWorldStandardWorkerExample();
app.run();

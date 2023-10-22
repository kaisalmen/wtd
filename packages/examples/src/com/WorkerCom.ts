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

            const resultInitCom1 = await workerTaskCom1.initWorker(new WorkerTaskMessage()) as MessageEvent<unknown>;
            const resultInitCom2 = await workerTaskCom2.initWorker(new WorkerTaskMessage()) as MessageEvent<unknown>;
            console.log(`initCom1 then: ${(resultInitCom1.data as WorkerTaskMessage).cmd}`);
            console.log(`initCom2 then: ${(resultInitCom2.data as WorkerTaskMessage).cmd}`);

            const t0 = performance.now();

            const execCom1 = new WorkerTaskMessage();
            const payload1 = new RawPayload();
            payload1.message.raw = { port: channel.port1 };
            execCom1.addPayload(payload1);

            const execCom2 = new WorkerTaskMessage();
            const payload2 = new RawPayload();
            payload2.message.raw = { port: channel.port2 };
            execCom2.addPayload(payload2);

            const onComplete = (message: WorkerTaskMessageType) => {
                console.log('Received final command: ' + message.cmd);
                const rawPayload = message.payloads[0] as RawPayload;
                console.log(`Worker said onComplete: ${rawPayload.message.raw.hello}`);
            };

            const resultExecCom1 = workerTaskCom1.executeWorker({
                message: execCom1,
                transferables: [channel.port1],
                onComplete
            });
            const resultExecCom2 = workerTaskCom2.executeWorker({
                message: execCom2,
                transferables: [channel.port2],
                onComplete
            });

            const result = await Promise.all([resultExecCom1, resultExecCom2]);
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

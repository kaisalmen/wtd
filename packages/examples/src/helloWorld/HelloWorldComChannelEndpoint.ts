import { WorkerMessage, ComChannelEndpoint, RawPayload } from 'wtd-core';

/**
 * Hello World example just using the ComChannelEndpoint
 */
class HelloWorldComChannelEndpointExample {

    async run() {
        const url = new URL(import.meta.env.DEV ? '../worker/HelloWorldComChannelEndpointWorker.ts' : '../worker/generated/HelloWorldComChannelEndpointWorker-es.js', import.meta.url);
        const endpoint = new ComChannelEndpoint({
            endpointName: 'HelloWorldWorker',
            endpointId: 1,
            endpointConfig: {
                $type: 'WorkerConfigParams',
                url,
                workerType: 'module',
            },
            verbose: true
        });
        endpoint.connect();

        try {
            const t0 = performance.now();

            const result = await endpoint.sentMessage({
                message: WorkerMessage.createNew({
                    cmd: 'hello_world'
                }),
                awaitAnswer: true,
                answer: 'hello_world_confirm'
            },);

            const rawPayload = result.payloads[0] as RawPayload;
            const answer = `Worker said: command: ${result.cmd} message: ${rawPayload.message.raw?.hello}`;
            const t1 = performance.now();

            const msg = `${answer}\nWorker execution has been completed after ${t1 - t0}ms.`;
            console.log(msg);
            alert(msg);
        } catch (e) {
            console.error(e);
        }
    }
}

const app = new HelloWorldComChannelEndpointExample();
app.run();

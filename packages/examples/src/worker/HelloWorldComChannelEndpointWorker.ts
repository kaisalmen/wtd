import { RawPayload, WorkerMessage, ComRouter, ComChannelEndpoint } from 'wtd-core';

/// <reference lib="WebWorker" />

declare const self: DedicatedWorkerGlobalScope;

class ExampleComRouterWorker implements ComRouter {

    private endpointFs?: ComChannelEndpoint;

    setComChannelEndpoint(comChannelEndpoint: ComChannelEndpoint): void {
        this.endpointFs = comChannelEndpoint;
    }

    async hello_world(message: WorkerMessage) {
        // burn some time
        for (let i = 0; i < 25000000; i++) {
            i++;
        }

        await this.endpointFs?.sentAnswer({
            message: WorkerMessage.createFromExisting(message, {
                overrideCmd: 'hello_world_confirm',
                overridePayloads: new RawPayload({
                    hello: 'Hello! I just incremented "i" 25 million times.'
                })
            }),
            awaitAnswer: false
        });
    }
}

new ComChannelEndpoint({
    endpointId: 2000,
    endpointConfig: {
        $type: 'DirectImplConfig',
        impl: self
    },
    verbose: true,
    endpointName: 'HelloWorldComChannelEndpointWorker'
}).connect(new ExampleComRouterWorker());

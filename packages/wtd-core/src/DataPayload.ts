import { AssociatedArrayType, Payload, PayloadHandler, PayloadRegister } from './Payload.js';
import { fillTransferables } from './utilities.js';

export type ParameterizedMessage = {
    params?: AssociatedArrayType<unknown>;
    buffers?: Map<string, ArrayBufferLike>;
}

export type DataPayloadAdditions = Payload & {
    message: ParameterizedMessage;
}

export class DataPayload implements DataPayloadAdditions {
    $type = 'DataPayload';
    message: ParameterizedMessage = {
        buffers: new Map(),
        params: {}
    };
    progress = 0;
}

export class DataPayloadHandler implements PayloadHandler {

    pack(payload: Payload, transferables: Transferable[], cloneBuffers: boolean): Transferable[] {
        const dp = payload as DataPayload;
        if (dp.message.buffers) {
            fillTransferables(dp.message.buffers?.values(), transferables, cloneBuffers);
        }
        return transferables;
    }

    unpack(transportObject: Payload, cloneBuffers: boolean): DataPayload {
        const dp = transportObject as DataPayload;
        const dtp = Object.assign(new DataPayload(), transportObject);
        if (dp.message.buffers) {
            for (const [name, buffer] of dp.message.buffers.entries()) {
                if (dtp.message.buffers) {
                    dtp.message.buffers.set(name, cloneBuffers ? buffer.slice(0) : buffer);
                }
            }
        }
        return dtp;
    }
}

// register the default handler
PayloadRegister.handler.set('DataPayload', new DataPayloadHandler());

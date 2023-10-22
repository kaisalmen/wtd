import { Payload } from './Payload.js';

export type RawMessage = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw: any;
}

export type RawPayloadAdditions = Payload & {
    message: RawMessage;
}

export class RawPayload implements RawPayloadAdditions {
    $type = 'RawPayload';
    message = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        raw: {} as any
    };
    handler = undefined;
}

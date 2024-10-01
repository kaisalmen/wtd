import { Payload } from './Payload.js';

export interface RawMessage {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw: any;
}

export interface RawPayloadAdditions extends Payload {
    message: RawMessage;
}

export class RawPayload implements RawPayloadAdditions {
    $type = 'RawPayload';
    message = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        raw: {} as any
    };

    constructor(raw?: unknown) {
        if (raw !== undefined) {
            this.message.raw = raw;
        }
    }
}

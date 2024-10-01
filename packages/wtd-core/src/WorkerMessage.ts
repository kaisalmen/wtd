import { Payload, PayloadRegister } from './Payload.js';

export interface WorkerMessageConfig {
    cmd?: WorkerCommand;
    name?: string;
    endpointdId?: number;
    payloads?: Payload[];
    answer?: boolean;
}

export type WorkerCommand = string | 'unknown';

export class WorkerMessage {
    cmd: WorkerCommand = 'unknown';
    uuid: string = 'unknown';
    name = 'unnamed';
    endpointdId = 0;
    payloads: Payload[] = [];
    answer?: boolean = false;

    constructor(config?: WorkerMessageConfig) {
        this.cmd = config?.cmd ?? this.cmd;
        this.name = config?.name ?? this.name;
        this.endpointdId = config?.endpointdId ?? this.endpointdId;
        this.answer = config?.answer ?? this.answer;
    }

    addPayload(payloads?: Payload[] | Payload) {
        if (!payloads) return;

        if (Array.isArray(payloads)) {
            this.payloads = this.payloads.concat(payloads);
        } else {
            this.payloads.push(payloads);
        }
    }

    static createNew(message: WorkerMessageConfig) {
        return new WorkerMessage(message);
    }

    static createEmpty() {
        return WorkerMessage.createNew({});
    }

    static createFromExisting(message: WorkerMessage, options?: {
        overrideCmd?: WorkerCommand,
        overrideUuid?: string,
        answer?: boolean
    }) {
        const wm = WorkerMessage.createNew(message);
        wm.uuid = message.uuid;
        if (options?.overrideCmd !== undefined) {
            wm.cmd = options.overrideCmd;
        }
        if (options?.overrideUuid !== undefined) {
            wm.uuid = options.overrideUuid;
        }
        if (options?.answer !== undefined) {
            wm.answer = options.answer;
        }
        return wm;
    }

    static pack(payloads?: Payload[], cloneBuffers?: boolean): Transferable[] {
        const transferables: Transferable[] = [];
        if (payloads) {
            for (const payload of payloads) {
                const handler = PayloadRegister.handler.get(payload.$type);
                handler?.pack(payload, transferables, cloneBuffers === true);
            }
        }
        return transferables;
    }

    static unpack(rawMessage: WorkerMessage, cloneBuffers?: boolean) {
        const instance = WorkerMessage.createFromExisting(rawMessage, {
            overrideUuid: rawMessage.uuid
        });

        for (const payload of rawMessage.payloads) {
            const handler = PayloadRegister.handler.get(payload.$type);
            instance.addPayload(handler?.unpack(payload, cloneBuffers === true));
        }
        return instance;
    }

    static fromPayload(payloads: Payload | Payload[], cmd?: WorkerCommand) {
        const wm = WorkerMessage.createNew({
            cmd
        });
        wm.addPayload(payloads);
        return wm;
    }
}

export class WorkerTaskMessage extends WorkerMessage {

}

import { Payload, PayloadRegister } from './Payload.js';
import { WorkerTaskCommandRequest, WorkerTaskCommandResponse } from './WorkerTaskWorker.js';

export type WorkerTaskMessageConfig = {
    cmd?: WorkerTaskCommands;
    name?: string;
    workerId?: number;
    progress?: number;
    payloads?: Payload[];
}

export type WorkerTaskCommands = WorkerTaskCommandRequest | WorkerTaskCommandResponse | string | 'unknown';

export class WorkerTaskMessage {
    cmd: WorkerTaskCommands = 'unknown';
    uuid: string = 'unknown';
    name = 'unnamed';
    workerId = 0;
    progress = 0;
    payloads: Payload[] = [];

    private constructor(config?: WorkerTaskMessageConfig) {
        this.cmd = config?.cmd ?? this.cmd;
        this.name = config?.name ?? this.name;
        this.workerId = config?.workerId ?? this.workerId;
        this.progress = config?.progress ?? this.progress;
    }

    addPayload(payloads?: Payload[] | Payload) {
        if (!payloads) return;

        if (Array.isArray(payloads)) {
            this.payloads = this.payloads.concat(payloads);
        } else {
            this.payloads.push(payloads);
        }
    }

    static createNew(message: WorkerTaskMessageConfig) {
        return new WorkerTaskMessage(message);
    }

    static createEmpty() {
        return WorkerTaskMessage.createNew({});
    }

    static createFromExisting(message: WorkerTaskMessage, options?: {
        overrideCmd?: WorkerTaskCommands,
        overrideUuid?: string
    }) {
        const wtm = WorkerTaskMessage.createNew(message);
        wtm.uuid = message.uuid;
        if (options?.overrideCmd) {
            wtm.cmd = options.overrideCmd;
        }
        if (options?.overrideUuid) {
            wtm.uuid = options.overrideUuid;
        }
        return wtm;
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

    static unpack(rawMessage: WorkerTaskMessage, cloneBuffers?: boolean) {
        const instance = WorkerTaskMessage.createFromExisting(rawMessage, {
            overrideUuid: rawMessage.uuid
        });

        if (rawMessage.payloads) {
            for (const payload of rawMessage.payloads) {
                const handler = PayloadRegister.handler.get(payload.$type);
                instance.addPayload(handler?.unpack(payload, cloneBuffers === true));
            }
        }
        return instance;
    }

    static fromPayload(payloads: Payload | Payload[], cmd?: WorkerTaskCommands) {
        const wtm = WorkerTaskMessage.createNew({
            cmd
        });
        wtm.addPayload(payloads);
        return wtm;
    }
}

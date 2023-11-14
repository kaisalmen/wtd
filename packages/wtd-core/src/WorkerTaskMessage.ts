import { Payload, PayloadRegister } from './Payload.js';
import { WorkerTaskCommandRequest, WorkerTaskCommandResponse } from './WorkerTaskWorker.js';

export type WorkerTaskMessageConfig = {
    cmd?: WorkerTaskCommands;
    id?: number;
    name?: string;
    workerId?: number;
    progress?: number;
    payloads?: Payload[];
}

export type WorkerTaskCommands = WorkerTaskCommandRequest | WorkerTaskCommandResponse | string | 'unknown';

export class WorkerTaskMessage {
    cmd: WorkerTaskCommands = 'unknown';
    id = 0;
    name = 'unnamed';
    workerId = 0;
    progress = 0;
    payloads: Payload[] = [];

    constructor(config?: WorkerTaskMessageConfig) {
        this.cmd = config?.cmd ?? this.cmd;
        this.id = config?.id ?? this.id;
        this.name = config?.name ?? this.name;
        this.workerId = config?.workerId ?? this.workerId;
        this.progress = config?.progress ?? this.progress;
    }

    setCommand(cmd: WorkerTaskCommands) {
        this.cmd = cmd;
    }

    addPayload(payloads?: Payload[] | Payload) {
        if (!payloads) return;

        if (Array.isArray(payloads)) {
            this.payloads = this.payloads.concat(payloads);
        } else {
            this.payloads.push(payloads);
        }
    }

    static createFromExisting(message: WorkerTaskMessageConfig, overrideCmd?: WorkerTaskCommands) {
        const wtm = new WorkerTaskMessage(message);
        if (overrideCmd) {
            wtm.setCommand(overrideCmd);
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

    static unpack(rawMessage: WorkerTaskMessageConfig, cloneBuffers?: boolean) {
        const instance = new WorkerTaskMessage(rawMessage);

        if (rawMessage.payloads) {
            for (const payload of rawMessage.payloads) {
                const handler = PayloadRegister.handler.get(payload.$type);
                instance.addPayload(handler?.unpack(payload, cloneBuffers === true));
            }
        }
        return instance;
    }

    static fromPayload(payloads: Payload | Payload[], cmd?: WorkerTaskCommands) {
        const wtm = new WorkerTaskMessage({});
        if (cmd) {
            wtm.setCommand(cmd);
        }
        wtm.addPayload(payloads);
        return wtm;
    }
}

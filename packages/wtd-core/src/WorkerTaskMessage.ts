import { Payload, PayloadRegister } from './Payload.js';

export type WorkerTaskMessageHeaderType = {
    id?: number;
    name?: string;
    workerId?: number;
    progress?: number;
}

export type WorkerTaskCommandType = {
    cmd: string;
}

export type WorkerTaskMessageBodyType = {
    payloads: Payload[];
}

export type WorkerTaskMessageType = WorkerTaskMessageHeaderType & WorkerTaskCommandType & WorkerTaskMessageBodyType

export class WorkerTaskMessage implements WorkerTaskMessageType {
    cmd = 'unknown';
    id = 0;
    name = 'unnamed';
    workerId = 0;
    progress = 0;
    payloads: Payload[] = [];

    constructor(config?: WorkerTaskMessageHeaderType) {
        this.id = config?.id ?? this.id;
        this.name = config?.name ?? this.name;
        this.workerId = config?.workerId ?? this.workerId;
        this.progress = config?.progress ?? this.progress;
    }

    addPayload(payloads?: Payload[] | Payload) {
        if (!payloads) {
            return;
        } else if (Array.isArray(payloads)) {
            this.payloads = this.payloads.concat(payloads);
        } else {
            this.payloads.push(payloads);
        }
    }
}

export const createFromExisting = (message: WorkerTaskMessageType, cmd?: string) => {
    const wtm = new WorkerTaskMessage(message);
    if (cmd) {
        wtm.cmd = cmd;
    }
    return wtm;
};

export const pack = (payloads: Payload[], cloneBuffers: boolean): Transferable[] => {
    const transferables: Transferable[] = [];
    for (const payload of payloads) {
        const handler = PayloadRegister.handler.get(payload.$type);
        handler?.pack(payload, transferables, cloneBuffers);
    }
    return transferables;
};

export const unpack = (rawMessage: WorkerTaskMessageType, cloneBuffers: boolean) => {
    const instance = new WorkerTaskMessage(rawMessage);
    instance.cmd = rawMessage.cmd;

    for (const payload of rawMessage.payloads) {
        const handler = PayloadRegister.handler.get(payload.$type);
        instance.addPayload(handler?.unpack(payload, cloneBuffers));
    }
    return instance;
};

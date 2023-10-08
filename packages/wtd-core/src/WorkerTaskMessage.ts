import {
    PayloadRegister,
    DataPayload
} from './DataPayload.js';

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
    payloads: DataPayload[]
}

export type WorkerTaskMessageType = WorkerTaskMessageHeaderType & WorkerTaskCommandType & WorkerTaskMessageBodyType

export class WorkerTaskMessage implements WorkerTaskMessageType {
    cmd = 'unknown';
    id = 0;
    name = 'unnamed';
    workerId = 0;
    progress = 0;
    payloads: DataPayload[] = [];

    constructor(config?: WorkerTaskMessageHeaderType) {
        this.id = config?.id ?? this.id;
        this.name = config?.name ?? this.name;
        this.workerId = config?.workerId ?? this.workerId;
        this.progress = config?.progress ?? this.progress;
    }

    addPayload(payload: DataPayload | DataPayload[] | undefined) {
        if (!payload) {
            return;
        }
        else if (Array.isArray(payload)) {
            this.payloads = this.payloads.concat(payload);
        }
        else {
            this.payloads.push(payload);
        }
    }

    static createFromExisting(message: WorkerTaskMessageType, cmd?: string) {
        const wtm = new WorkerTaskMessage(message);
        if (cmd) {
            wtm.cmd = cmd;
        }
        return wtm;
    }

    pack(cloneBuffers: boolean): Transferable[] {
        const transferables: Transferable[] = [];
        for (const payload of this.payloads) {
            const handler = PayloadRegister.handler.get(payload.type);
            handler?.pack(payload, transferables, cloneBuffers);
        }
        return transferables;
    }

    static unpack(rawMessage: WorkerTaskMessageType, cloneBuffers: boolean) {
        const instance = new WorkerTaskMessage(rawMessage);
        instance.cmd = rawMessage.cmd;

        for (const payload of rawMessage.payloads) {
            const handler = PayloadRegister.handler.get(payload.type);
            instance.addPayload(handler?.unpack(payload, cloneBuffers));
        }
        return instance;
    }
}

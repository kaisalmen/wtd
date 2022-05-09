import {
    PayloadRegister,
    DataPayload
} from './DataPayload';

export type WorkerTaskMessageHeaderType = {
    cmd?: string;
    id?: number;
    name?: string;
    workerId?: number;
    progress?: number;
}

export type WorkerTaskMessageBodyType = {
    payloads: DataPayload[]
}

export type WorkerTaskMessageType = WorkerTaskMessageHeaderType & WorkerTaskMessageBodyType

export class WorkerTaskMessage implements WorkerTaskMessageType {
    cmd = 'unknown';
    id = 0;
    name = 'unnamed';
    workerId = 0;
    progress = 0;
    payloads: DataPayload[] = [];

    constructor(config: WorkerTaskMessageHeaderType) {
        this.cmd = config.cmd ?? this.cmd;
        this.id = config.id ?? this.id;
        this.name = config.name ?? this.name;
        this.workerId = config.workerId ?? this.workerId;
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

    cleanPayloads() {
        this.payloads = [];
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
        const instance = Object.assign(new WorkerTaskMessage({}), rawMessage);
        instance.cleanPayloads();

        for (const payload of rawMessage.payloads) {
            const handler = PayloadRegister.handler.get(payload.type);
            instance.addPayload(handler?.unpack(payload, cloneBuffers));
        }
        return instance;
    }
}

export type AssociatedArrayType<T> = { [key: string]: T }

export type Payload = {
    $type: string;
    message: unknown;
}

export type PayloadHandler = {
    pack(payload: Payload, transferable: Transferable[], cloneBuffers: boolean): Transferable[];
    unpack(transportObject: Payload, cloneBuffers: boolean): Payload;
}

export class PayloadRegister {
    static handler = new Map<string, PayloadHandler>();
}

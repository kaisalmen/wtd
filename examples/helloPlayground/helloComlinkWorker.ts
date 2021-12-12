import * as Comlink from 'comlink';

export type HelloComlinkWorker = {
    counter: number,
    inc: () => void
}

export const obj: HelloComlinkWorker = {
    counter: 0,
    inc() {
        this.counter++;
    },
};

Comlink.expose(obj);

import type {
    WorkerTaskMessageType
} from './WorkerTaskMessage';
import {
    WorkerTaskMessage
} from './WorkerTaskMessage';

export type WorkerRegistrationType = {
    module: boolean;
    blob: boolean;
    url: URL | string | undefined;
}

export type WorkerExecutionPlanType = {
    taskTypeName: string;
    message: WorkerTaskMessage;
    onComplete: (message: WorkerTaskMessageType) => void;
    onIntermediate?: (message: WorkerTaskMessageType) => void;
    transferables?: Transferable[];
    promiseFunctions?: {
        resolve: (value: unknown) => void,
        reject: (reason?: unknown) => void | undefined
    };
}

export class WorkerTask {

    private taskTypeName: string;
    private workerId: number;
    private verbose: boolean;

    private workerRegistration: WorkerRegistrationType = {
        module: true,
        blob: false,
        url: undefined
    };

    private worker: Worker | undefined;
    private executing = false;

    constructor(taskTypeName: string, workerId: number, workerRegistration: WorkerRegistrationType, verbose?: boolean) {
        this.taskTypeName = taskTypeName;
        this.workerId = workerId;
        this.workerRegistration = workerRegistration;
        this.verbose = verbose === true;
    }

    isWorkerExecuting() {
        return this.executing;
    }

    markExecuting(executing: boolean) {
        this.executing = executing;
    }

    static createWorkerBlob(code: string[]) {
        const simpleWorkerBlob = new Blob(code, { type: 'application/javascript' });
        return window.URL.createObjectURL(simpleWorkerBlob);
    }

    static async wait(milliseconds: number) {
        return new Promise(resolve => {
            setTimeout(resolve, milliseconds);
        });
    }

    async initWorker(message?: WorkerTaskMessage, transferables?: Transferable[]) {
        return new Promise((resolve, reject) => {
            this.worker = this.createWorker();
            if (this.verbose) {
                console.log(`Task: ${this.taskTypeName}: Waiting for completion of initialization of all workers.`);
            }

            if (!this.worker) {
                reject(new Error('No worker was created before initWorker was called.'));
            }
            else {
                if (!message) {
                    resolve('WorkerTask#initWorker: No Payload provided => No init required');
                    return;
                }
                this.worker.onmessage = m => {
                    if (this.verbose) {
                        console.log(`Init Completed: ${message.name}: ${m.data.id}`);
                    }
                    resolve(m);
                };
                this.worker.onerror = m => {
                    if (this.verbose) {
                        console.log(`Init Aborted: ${message.name}: ${m.error}`);
                    }
                    reject(m);
                };
                message.cmd = 'init';
                message.workerId = this.workerId;
                if (transferables) {
                    // ensure all transferables are copies to all workers on init!
                    const transferablesToWorker = [];
                    for (const transferable of transferables) {
                        transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                    }
                    this.worker.postMessage(message, transferablesToWorker);
                }
                else {
                    this.worker.postMessage(message);
                }
            }
        });
    }

    private createWorker() {
        if (this.workerRegistration.url) {
            if (this.workerRegistration.blob) {
                return new Worker(this.workerRegistration.url);
            }
            else {
                const workerOptions = (this.workerRegistration.module ? { type: 'module' } : { type: 'classic' }) as WorkerOptions;
                return new Worker((this.workerRegistration.url as URL).href, workerOptions);
            }
        }
        return undefined;
    }

    executeWorker(plan: WorkerExecutionPlanType) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Execution error: Worker is undefined.'));
            }
            else {
                this.markExecuting(true);
                this.worker.onmessage = message => {
                    // allow intermediate asset provision before flagging execComplete
                    if (message.data.cmd === 'intermediate') {
                        if (typeof plan.onIntermediate === 'function') {
                            plan.onIntermediate(message.data);
                        }
                    } else {
                        const completionMsg = `Execution Completed: ${plan.message.name}: ${message.data.id}`;
                        if (this.verbose) {
                            console.log(completionMsg);
                        }
                        plan.onComplete((message as MessageEvent).data);
                        resolve(completionMsg);
                        this.markExecuting(false);
                    }
                };
                this.worker.onerror = message => {
                    if (this.verbose) {
                        console.log(`Execution Aborted: ${plan.message.name}: ${message.error}`);
                    }
                    reject(message);
                    this.markExecuting(false);
                };
                plan.message.cmd = 'execute';
                plan.message.workerId = this.workerId;
                this.worker.postMessage(plan.message, plan.transferables!);
            }
        });
    }

    dispose() {
        this.worker?.terminate();
    }

}

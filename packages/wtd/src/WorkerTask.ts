export type PayloadType = {
    cmd: string;
    id: number;
    name: string | 'unknown';
    type?: string | 'unknown';
    workerId?: number;
    // TODO: params should be data
    params?: Record<string, unknown>;
}

export type WorkerRegistration = {
    module: boolean;
    blob: boolean;
    url: URL | string | undefined;
}

export type WorkerExecutionPlan = {
    taskTypeName: string;
    payload: PayloadType;
    onComplete: (data: PayloadType) => void;
    onIntermediate?: (data: PayloadType) => void;
    transferables?: Transferable[];
    promiseFunctions?: {
        resolve: (value: unknown) => void,
        reject: (reason?: unknown) => void | undefined
    };
}

/**
 * Defines a worker type: functions, dependencies and runtime information once it was created.
 */
export class WorkerTask {

    private taskTypeName: string;
    private workerId: number;
    private verbose: boolean;

    private workerRegistration: WorkerRegistration = {
        module: true,
        blob: false,
        url: undefined
    };

    private worker: Worker | undefined;
    private executing = false;

    /**
     * Creates a new instance of {@link WorkerTask}.
     *
     * @param {string} taskTypeName The name of the registered task type.
     * @param {number} workerId The workerId
     * @param {WorkerRegistration} workerRegistration The name of the registered task type.
     * @param {boolean} [verbose] Set if logging should be verbose
     */
    constructor(taskTypeName: string, workerId: number, workerRegistration: WorkerRegistration, verbose?: boolean) {
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

    async initWorker(payload: PayloadType, transferables?: Transferable[]) {
        return new Promise((resolve, reject) => {
            this.worker = this.createWorker();
            if (this.verbose) {
                console.log(`Task: ${this.taskTypeName}: Waiting for completion of initialization of all workers.`);
            }

            if (!this.worker) {
                reject(new Error('No worker was created before initWorker was called.'));
            }
            else {
                this.worker.onmessage = message => {
                    if (this.verbose) {
                        console.log(`Init Completed: ${payload.type}: ${message.data.id}`);
                    }
                    resolve(message);
                };
                this.worker.onerror = message => {
                    if (this.verbose) {
                        console.log(`Init Aborted: ${payload.type}: ${message.error}`);
                    }
                    reject(message);
                };
                payload.cmd = 'init';
                payload.workerId = this.workerId;
                if (transferables) {
                    // ensure all transferables are copies to all workers on init!
                    const transferablesToWorker = [];
                    for (const transferable of transferables) {
                        transferablesToWorker.push((transferable as ArrayBufferLike).slice(0));
                    }
                    this.worker.postMessage(payload, transferablesToWorker);
                }
                else {
                    this.worker.postMessage(payload);
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

    executeWorker(plan: WorkerExecutionPlan) {
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
                        const completionMsg = `Execution Completed: ${plan.payload.type}: ${message.data.id}`;
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
                        console.log(`Execution Aborted: ${plan.payload.type}: ${message.error}`);
                    }
                    reject(message);
                    this.markExecuting(false);
                };
                plan.payload.cmd = 'execute';
                plan.payload.workerId = this.workerId;
                this.worker.postMessage(plan.payload, plan.transferables!);
            }
        });
    }

    dispose() {
        this.worker?.terminate();
    }

}

export class WorkerTaskManager {
    constructor(maxParallelExecutions?: number | undefined);
    taskTypes: Map<string, WorkerTypeDefinition>;
    verbose: boolean;
    maxParallelExecutions: number;
    actualExecutionCount: number;
    storedExecutions: StoredExecution[];
    teardown: boolean;
    setVerbose(verbose: boolean): WorkerTaskManager;
    setMaxParallelExecutions(maxParallelExecutions: number): WorkerTaskManager;
    getMaxParallelExecutions(): number;
    supportsTaskType(taskTypeName: string): boolean;
    registerTaskTypeStandard(taskTypeName: string, initFunction: Function, executeFunction: Function, comRoutingFunction: Function, fallback: boolean, dependencyDescriptions?: Object[] | undefined): boolean;
    registerTaskTypeWithUrl(taskTypeName: string, moduleWorker: boolean, workerUrl: string): boolean;
    initTaskType(taskTypeName: string, config: object, transferables?: Transferable[] | undefined): Promise<void>;
    _wait(milliseconds: any): Promise<any>;
    enqueueForExecution(taskTypeName: string, config: object, assetAvailableFunction: Function, transferables?: Transferable[] | undefined): Promise<any>;
    _depleteExecutions(): void;
    dispose(): WorkerTaskManager;
}
declare class WorkerTypeDefinition {
    constructor(taskTypeName: string, maximumCount: number, fallback: boolean, verbose?: boolean | undefined);
    taskTypeName: string;
    fallback: boolean;
    verbose: boolean;
    initialised: boolean;
    functions: {
        init: Function;
        execute: Function;
        comRouting: Function;
        dependencies: {
            descriptions: Object[];
            code: string[];
        };
        moduleWorker: boolean;
        workerUrl: URL;
    };
    workers: {
        code: string[];
        instances: TaskWorker[] | MockedTaskWorker[];
        available: TaskWorker[] | MockedTaskWorker[];
    };
    status: {
        initStarted: boolean;
        initComplete: boolean;
    };
    getTaskType(): string;
    setFunctions(initFunction: Function, executeFunction: Function, comRoutingFunction?: Function | undefined): void;
    private _addWorkerCode;
    setDependencyDescriptions(dependencyDescriptions: Object[]): void;
    setWorkerUrl(moduleWorker: boolean, workerUrl: string): void;
    isWorkerModule(): boolean;
    haveWorkerUrl(): boolean;
    loadDependencies(): string[];
    createWorkers(): Promise<void>;
    createWorkerFromUrl(module: any): Promise<void>;
    initWorkers(config: object, transferables: Transferable[]): Promise<void>;
    getAvailableTask(): TaskWorker | MockedTaskWorker | undefined;
    hasTask(): boolean;
    returnAvailableTask(taskWorker: TaskWorker | MockedTaskWorker): void;
    dispose(): void;
}
declare class StoredExecution {
    constructor(taskTypeName: string, config: object, assetAvailableFunction: Function, resolve: Function, reject: Function, transferables?: Transferable[] | undefined);
    taskTypeName: string;
    config: object;
    assetAvailableFunction: Function;
    resolve: Function;
    reject: Function;
    transferables: Transferable[] | undefined;
}
declare class TaskWorker extends Worker {
    constructor(id: number, aURL: string, options?: object | undefined);
    id: number;
    getId(): number;
}
declare class MockedTaskWorker {
    constructor(id: number, initFunction: Function, executeFunction: Function);
    id: number;
    functions: {
        init: Function;
        execute: Function;
    };
    getId(): number;
    postMessage(message: string, transfer?: Transferable[] | undefined): void;
    terminate(): void;
}
export {};

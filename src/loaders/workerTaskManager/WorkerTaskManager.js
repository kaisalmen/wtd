/**
 * Development repository: https://github.com/kaisalmen/three-wtm
 * Initial idea by Don McCurdy / https://www.donmccurdy.com
 */

import { FileLoader } from 'three';
import { WorkerTaskManagerDefaultRouting } from './worker/defaultRouting.js';

/**
 * Register one to many tasks type to the WorkerTaskManager. Then init and enqueue a worker based execution by passing
 * configuration and buffers. The WorkerTaskManager allows to execute a maximum number of executions in parallel.
 */
class WorkerTaskManager {

	/**
	 * Creates a new WorkerTaskManager instance.
	 *
	 * @param {number} [maxParallelExecutions] How many workers are allowed to be executed in parallel.
	 */
	constructor(maxParallelExecutions) {
		/**
		 * @type {Map<string, WorkerTypeDefinition>}
		 */
		this.taskTypes = new Map();
		this.verbose = false;
		this.maxParallelExecutions = maxParallelExecutions ? maxParallelExecutions : 4;
		this.actualExecutionCount = 0;
		/**
		 * @type {StoredExecution[]}
		 */
		this.storedExecutions = [];
		this.teardown = false;
	}

	/**
	 * Set if logging should be verbose
	 *
	 * @param {boolean} verbose
	 * @return {WorkerTaskManager}
	 */
	setVerbose(verbose) {
		this.verbose = verbose;
		return this;
	}

	/**
	 * Set the maximum number of parallel executions.
	 *
	 * @param {number} maxParallelExecutions How many workers are allowed to be executed in parallel.
	 * @return {WorkerTaskManager}
	 */
	setMaxParallelExecutions(maxParallelExecutions) {
		this.maxParallelExecutions = maxParallelExecutions;
		return this;
	}

	/**
	 * Returns the maximum number of parallel executions.
	 * @return {number}
	 */
	getMaxParallelExecutions() {
		return this.maxParallelExecutions;
	}

	/**
	 * Returns true if support for the given task type is available.
	 *
	 * @param {string} taskTypeName The task type as string
	 * @return boolean
	 */
	supportsTaskType(taskTypeName) {
		return this.taskTypes.has(taskTypeName);
	}

	/**
	 * Registers functions and dependencies for a new task type.
	 *
	 * @param {string} taskTypeName The name to be used for registration.
	 * @param {Function} initFunction The function to be called when the worker is initialised
	 * @param {Function} executeFunction The function to be called when the worker is executed
	 * @param {Function} comRoutingFunction The function that should handle communication, leave undefined for default behavior
	 * @param {boolean} fallback Set to true if execution should be performed in main
	 * @param {Object[]} [dependencyDescriptions]
	 * @return {boolean} Tells if registration is possible (new=true) or if task was already registered (existing=false)
	 */
	registerTaskTypeStandard(taskTypeName, initFunction, executeFunction, comRoutingFunction, fallback, dependencyDescriptions) {
		let allowedToRegister = !this.supportsTaskType(taskTypeName);
		if (allowedToRegister) {
			let workerTypeDefinition = new WorkerTypeDefinition(taskTypeName, this.maxParallelExecutions, fallback, this.verbose);
			workerTypeDefinition.setFunctions(initFunction, executeFunction, comRoutingFunction);
			workerTypeDefinition.setDependencyDescriptions(dependencyDescriptions);
			this.taskTypes.set(taskTypeName, workerTypeDefinition);
		}
		return allowedToRegister;
	}

	/**
	 * Registers functionality for a new task type based on module file.
	 *
	 * @param {string} taskTypeName The name to be used for registration.
	 * @param {boolean} moduleWorker If the worker is a module or a standard worker
	 * @param {string} workerUrl The URL to be used for the Worker. Worker must provide logic to handle "init" and "execute" messages.
	 * @return {boolean} Tells if registration is possible (new=true) or if task was already registered (existing=false)
	 */
	registerTaskTypeWithUrl(taskTypeName, moduleWorker, workerUrl) {
		let allowedToRegister = !this.supportsTaskType(taskTypeName);
		if (allowedToRegister) {
			let workerTypeDefinition = new WorkerTypeDefinition(taskTypeName, this.maxParallelExecutions, false, this.verbose);
			workerTypeDefinition.setWorkerUrl(moduleWorker, workerUrl);
			this.taskTypes.set(taskTypeName, workerTypeDefinition);
		}
		return allowedToRegister;
	}

	/**
	 * Provides initialization configuration and transferable objects.
	 *
	 * @param {string} taskTypeName The name of the registered task type.
	 * @param {object} config Configuration properties as serializable string.
	 * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
	 */
	async initTaskType(taskTypeName, config, transferables) {
		let workerTypeDefinition = this.taskTypes.get(taskTypeName);
		if (workerTypeDefinition) {

			if (!workerTypeDefinition.status.initStarted) {
				workerTypeDefinition.status.initStarted = true;
				if (workerTypeDefinition.haveWorkerUrl()) {
					await workerTypeDefinition.createWorkerFromUrl(workerTypeDefinition.isWorkerModule())
						.then(() => workerTypeDefinition.initWorkers(config, transferables))
						.then(() => workerTypeDefinition.status.initComplete = true)
						.catch(e => console.error(e));
				}
				else {
					await workerTypeDefinition.loadDependencies()
						.then(() => workerTypeDefinition.createWorkers())
						.then(() => workerTypeDefinition.initWorkers(config, transferables))
						.then(() => workerTypeDefinition.status.initComplete = true)
						.catch(e => console.error(e));
				}
			}
		}
		else {
			while (!workerTypeDefinition.status.initComplete) {
				await this._wait(10);
			}
		}
	}

	async _wait(milliseconds) {
		return new Promise(resolve => {
			setTimeout(resolve, milliseconds);
		});
	}

	/**
	 * Queues a new task of the given type. Task will not execute until initialization completes.
	 *
	 * @param {string} taskTypeName The name of the registered task type.
	 * @param {object} config Configuration properties as serializable string.
	 * @param {Function} assetAvailableFunction Invoke this function if an asset become intermediately available
	 * @param {Transferable[]} [transferables] Any optional {@link ArrayBuffer} encapsulated in object.
	 * @return {Promise}
	 */
	async enqueueForExecution(taskTypeName, config, assetAvailableFunction, transferables) {
		let localPromise = new Promise((resolveUser, rejectUser) => {
			this.storedExecutions.push(new StoredExecution(taskTypeName, config, assetAvailableFunction, resolveUser, rejectUser, transferables));
			this._depleteExecutions();
		});
		return localPromise;
	}

	_depleteExecutions() {
		let counter = 0;
		while (this.actualExecutionCount < this.maxParallelExecutions && counter < this.storedExecutions.length) {

			// TODO: storedExecutions and results from worker seem to get mixed up
			let storedExecution = this.storedExecutions[counter];
			let workerTypeDefinition = this.taskTypes.get(storedExecution.taskTypeName);
			let taskWorker = workerTypeDefinition.getAvailableTask();
			if (taskWorker) {
				this.storedExecutions.splice(counter, 1);
				this.actualExecutionCount++;

				let promiseWorker = new Promise((resolveWorker, rejectWorker) => {
					taskWorker.onmessage = message => {
						// allow intermediate asset provision before flagging execComplete
						if (message.data.cmd === 'assetAvailable') {
							if (storedExecution.assetAvailableFunction instanceof Function) {
								storedExecution.assetAvailableFunction(message.data);
							}
						} else {
							resolveWorker(message);
						}
					};
					taskWorker.onerror = rejectWorker;
					taskWorker.postMessage({
						cmd: "execute",
						workerId: taskWorker.getId(),
						config: storedExecution.config
					}, storedExecution.transferables);
				});
				promiseWorker.then((message) => {
					workerTypeDefinition.returnAvailableTask(taskWorker);
					storedExecution.resolve(message.data);
					this.actualExecutionCount--;
					this._depleteExecutions();
				}).catch((e) => {
					storedExecution.reject("Execution error: " + e);
				});
			} else {
				counter++;
			}
		}
	}

	/**
	 * Destroys all workers and associated resources.
	 * @return {WorkerTaskManager}
	 */
	dispose() {
		this.teardown = true;
		for (let workerTypeDefinition of this.taskTypes.values()) {
			workerTypeDefinition.dispose();
		}
		return this;
	}
}

/**
 * Defines a worker type: functions, dependencies and runtime information once it was created.
 */
class WorkerTypeDefinition {

	/**
	 * Creates a new instance of {@link WorkerTypeDefinition}.
	 *
	 * @param {string} taskTypeName The name of the registered task type.
	 * @param {Number} maximumCount Maximum worker count
	 * @param {boolean} fallback Set to true if execution should be performed in main
	 * @param {boolean} [verbose] Set if logging should be verbose
	 */
	constructor(taskTypeName, maximumCount, fallback, verbose) {
		this.taskTypeName = taskTypeName;
		this.fallback = fallback;
		this.verbose = verbose === true;
		this.initialised = false;
		this.functions = {
			/** @type {Function} */
			init: null,
			/** @type {Function} */
			execute: null,
			/** @type {Function} */
			comRouting: null,
			dependencies: {
				/** @type {Object[]} */
				descriptions: [],
				/** @type {string[]} */
				code: []
			},
			/** @type {boolean} */
			moduleWorker: false,
			/**
			 * @type {URL}
			 */
			workerUrl: null
		};

		this.workers = {
			/** @type {string[]} */
			code: [],
			/** @type {TaskWorker[]|MockedTaskWorker[]} */
			instances: new Array(maximumCount),
			/** @type {TaskWorker[]|MockedTaskWorker[]} */
			available: []
		};

		this.status = {
			initStarted: false,
			initComplete: false
		}
	}

	getTaskType() {
		return this.taskTypeName;
	}

	/**
	 * Set the three functions. A default comRouting function is used if it is not passed here.
	 * Then it creates the code fr.
	 *
	 * @param {Function} initFunction The function to be called when the worker is initialised
	 * @param {Function} executeFunction The function to be called when the worker is executed
	 * @param {Function} [comRoutingFunction] The function that should handle communication, leave undefined for default behavior
	 */
	setFunctions(initFunction, executeFunction, comRoutingFunction) {
		this.functions.init = initFunction;
		this.functions.execute = executeFunction;
		this.functions.comRouting = comRoutingFunction;
		if (this.functions.comRouting === undefined || this.functions.comRouting === null) {

			this.functions.comRouting = WorkerTaskManagerDefaultRouting.comRouting;

		}
		this._addWorkerCode('init', this.functions.init.toString());
		this._addWorkerCode('execute', this.functions.execute.toString());
		this._addWorkerCode('comRouting', this.functions.comRouting.toString());
		this.workers.code.push('self.addEventListener( "message", message => comRouting( self, message, null, init, execute ), false );');
	}

	/**
	 *
	 * @param {string} functionName Name of the function
	 * @param {string} functionString A function as string
	 * @private
	 */
	_addWorkerCode(functionName, functionString) {
		if (functionString.startsWith('function')) {
			this.workers.code.push('const ' + functionName + ' = ' + functionString + ';\n\n');
		} else {
			this.workers.code.push('function ' + functionString + ';\n\n');
		}
	}

	/**
	 * Set the url of all dependent libraries (only used in non-module case).
	 *
	 * @param {Object[]} dependencyDescriptions URLs of code init and execute functions rely on.
	 */
	setDependencyDescriptions(dependencyDescriptions) {
		if (dependencyDescriptions) {
			dependencyDescriptions.forEach(description => { this.functions.dependencies.descriptions.push(description) });
		}
	}

	/**
	 * Set the url of the module worker.
	 *
	 * @param {boolean} moduleWorker If the worker is a module or a standard worker
	 * @param {string} workerUrl The URL is created from this string.
	 */
	setWorkerUrl(moduleWorker, workerUrl) {
		this.functions.moduleWorker = moduleWorker;
		this.functions.workerUrl = new URL(workerUrl, window.location.href);
	}

	/**
	 * Is it a module worker?
	 *
	 * @return {boolean} True or false
	 */
	isWorkerModule() {
		return (this.functions.moduleWorker && this.haveWorkerUrl());
	}

	/**
	 * If a URL for a worker was provided
	 *
	 * @returns {boolean} True or false
	 */
	haveWorkerUrl() {
		return (this.functions.workerUrl !== null);
	}

	/**
	 * Loads all dependencies and stores each as {@link ArrayBuffer} into the array. Returns if all loading is completed.
	 *
	 * @return {String[]}
	 */
	async loadDependencies() {
		let promises = [];
		let fileLoader = new FileLoader();
		fileLoader.setResponseType('arraybuffer');
		for (let description of this.functions.dependencies.descriptions) {

			if (description.url) {
				let url = new URL(description.url, window.location.href);
				promises.push(fileLoader.loadAsync(url.href, report => { if (this.verbose) console.log(report); }));
			}
			if (description.code) {
				promises.push(new Promise(resolve => resolve(description.code)));
			}

		}
		if (this.verbose) console.log('Task: ' + this.getTaskType() + ': Waiting for completion of loading of all dependencies.');
		this.functions.dependencies.code = await Promise.all(promises);
	}

	/**
	 * Creates workers based on the configured function and dependency strings.
	 *
	 */
	async createWorkers() {
		let worker;
		if (!this.fallback) {
			let workerBlob = new Blob(this.functions.dependencies.code.concat(this.workers.code), { type: 'application/javascript' });
			let objectURL = window.URL.createObjectURL(workerBlob);

			for (let i = 0; i < this.workers.instances.length; i++) {
				worker = new TaskWorker(i, objectURL);
				this.workers.instances[i] = worker;
			}
		}
		else {
			for (let i = 0; i < this.workers.instances.length; i++) {
				worker = new MockedTaskWorker(i, this.functions.init, this.functions.execute);
				this.workers.instances[i] = worker;
			}
		}
	}

	/**
	 * Creates module workers.
	 *
	 */
	async createWorkerFromUrl(module) {
		for (let worker, i = 0; i < this.workers.instances.length; i++) {
			if (module) {
				worker = new TaskWorker(i, this.functions.workerUrl.href, { type: "module" });
			}
			else {
				worker = new TaskWorker(i, this.functions.workerUrl.href);
			}
			this.workers.instances[i] = worker;
		}
	}

	/**
	 * Initialises all workers with common configuration data.
	 *
	 * @param {object} config
	 * @param {Transferable[]} transferables
	 */
	async initWorkers(config, transferables) {
		let promises = [];
		for (let taskWorker of this.workers.instances) {

			let taskWorkerPromise = new Promise((resolveWorker, rejectWorker) => {
				taskWorker.onmessage = message => {
					if (this.verbose) console.log('Init Complete: ' + message.data.id);
					resolveWorker(message);
				}
				taskWorker.onerror = rejectWorker;

				// ensure all transferables are copies to all workers on init!
				let transferablesToWorker;
				if (transferables) {
					transferablesToWorker = [];
					for (let i = 0; i < transferables.length; i++) {
						transferablesToWorker.push(transferables[i].slice(0));
					}
				}

				taskWorker.postMessage({
					cmd: "init",
					workerId: taskWorker.getId(),
					config: config
				}, transferablesToWorker);

			});
			promises.push(taskWorkerPromise);
		}

		if (this.verbose) console.log('Task: ' + this.getTaskType() + ': Waiting for completion of initialization of all workers.');
		await Promise.all(promises);
		this.workers.available = this.workers.instances;
	}

	/**
	 * Returns the first {@link TaskWorker} or {@link MockedTaskWorker} from array of available workers.
	 *
	 * @return {TaskWorker|MockedTaskWorker|undefined}
	 */
	getAvailableTask() {
		let task = undefined;
		if (this.hasTask()) {
			task = this.workers.available.shift();
		}
		return task;
	}

	/**
	 * Returns if a task is available or not.
	 *
	 * @return {boolean}
	 */
	hasTask() {
		return this.workers.available.length > 0;
	}

	/**
	 *
	 * @param {TaskWorker|MockedTaskWorker} taskWorker
	 */
	returnAvailableTask(taskWorker) {
		this.workers.available.push(taskWorker);
	}

	/**
	 * Dispose all worker instances.
	 */
	dispose() {
		for (let taskWorker of this.workers.instances) {
			taskWorker.terminate();
		}
	}

}

/**
 * Contains all things required for later executions of Worker.
 */
class StoredExecution {

	/**
	 * Creates a new instance.
	 *
	 * @param {string} taskTypeName
	 * @param {object} config
	 * @param {Function} assetAvailableFunction
	 * @param {Function} resolve
	 * @param {Function} reject
	 * @param {Transferable[]} [transferables]
	 */
	constructor(taskTypeName, config, assetAvailableFunction, resolve, reject, transferables) {
		this.taskTypeName = taskTypeName;
		this.config = config;
		this.assetAvailableFunction = assetAvailableFunction;
		this.resolve = resolve;
		this.reject = reject;
		this.transferables = transferables;
	}

}

/**
 * Extends the {@link Worker} with an id.
 */
class TaskWorker extends Worker {

	/**
	 * Creates a new instance.
	 *
	 * @param {number} id Numerical id of the task.
	 * @param {string} aURL
	 * @param {object} [options]
	 */
	constructor(id, aURL, options) {
		super(aURL, options);
		this.id = id;
	}

	/**
	 * Returns the id.
	 * @return {number}
	 */
	getId() {
		return this.id;
	}

}

/**
 * This is a mock of a worker to be used on Main. It defines necessary functions, so it can be handled like
 * a regular {@link TaskWorker}.
 */
class MockedTaskWorker {

	/**
	 * Creates a new instance.
	 *
	 * @param {number} id
	 * @param {Function} initFunction
	 * @param {Function} executeFunction
	 */
	constructor(id, initFunction, executeFunction) {
		this.id = id;
		this.functions = {
			init: initFunction,
			execute: executeFunction
		}
	}

	/**
	 * Returns the id.
	 * @return {number}
	 */
	getId() {
		return this.id;
	}

	/**
	 * Delegates the message to the registered functions
	 * @param {String} message
	 * @param {Transferable[]} [transfer]
	 */
	postMessage(message, transfer) {
		let scope = this;
		let self = {
			postMessage: function(m) {
				scope.onmessage({ data: m })
			}
		}
		WorkerTaskManagerDefaultRouting.comRouting(self, { data: message }, null, scope.functions.init, scope.functions.execute)
	}

	/**
	 * Mocking termination
	 */
	terminate() { }

}

export { WorkerTaskManager };

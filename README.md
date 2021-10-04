# three-wtm
**WorkerTaskManager for three.js**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/three-wtm/blob/main/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/three-wtm)

# Overview 
The `WorkerTaskManager` allows to register tasks expressed by an initialization, and an execution function with an optional comRounting function to be run in a web worker. It creates one to a maximum number of workers that can be used for execution. Multiple execution requests can be handled in parallel of the main task, If all workers are currently occupied the requested are enqueued, and the returned promise is fulfilled once a worker becomes available again.

## Features

- `WorkerTaskManager` supports standard workers:
  - Code for standard workers can be created from module code on main or just provided as file obeying the standard worker.
  - exec and init functions can be declared in module and then be packaged in standard worker if needed. I used this to define the worker code once and support both code paths
  - Loading of dependencies for standard workers is available
  - Main-Execution fallback is available
- `WorkerTaskManager` supports module workers:
  - Dependencies are declared regularly and therefore no extra functionality is needed
- Code is written in ES6+ notation and uses ES6+ features and class notation is used.
- `WorkerTaskManager` has an execution queue allowing to queue more task than can be currently handled
  OBJLoader2
- `WorkerTaskManager` is used by [wwobjloader2](https://github.com/kaisalmen/WWOBJLoader) and it is potentially added to three.js itself.
- Example shows [webgl_loader_workertaskmanager.html](public/examples/webgl_loader_workertaskmanager.html) how an existing `OBJLoader` can be wrapped in a worker.
- Additional utility functions are available allowing to transfer BufferGeometry, Material (meta-information) and Mesh bi-driectionally between Main and workers. All "transferables" shall be treated as such.


# Getting Started

There exist three possibilities:
* Press the `Gitpod` button above and start coding and using the examples directly in the browser
* Checkout the repository and use `docker-compose up -d` to spin up local snowpack dev server
* Checkout the repository and run `npm install` and then `npm run dev` to spin up local snowpack dev server

Whatever environment you choose to start [snowpack](https://www.snowpack.dev/) is used to serve the code and the examples using it. With this setup you are able to change the code and examples without invoking an additional bundler. Snowpack ensures all imported npm modules are available if previously installed in local environment (see `npm install`).

If you run snowpack locally you require a `nodejs` and `npm`. The Gitpod and local docker environment ensure all prerequisites are fulfilled. 

In any environment the dev server is reachable on port 8080.

## Main Branches

Main development takes place on branch [main](https://github.com/kaisalmen/three-wtm/tree/main).
<br>
The [stable](https://github.com/kaisalmen/three-wtm/tree/stable) branch contains the release versions.

## Docs
Run `npm run doc` to create the documentation in directory **build/docs**.

## Examples

This gives you an idead how you can define a standard worker inline and the register it with `WorkerTaskManager`, init and execute it:
```javascript
const init = function ( context, id, config ) {
  /* init code ... */
  context.postMessage( { cmd: "init", id: id } );
};

const execute = function ( context, id, config ) {
  /* execution code ... */
  context.postMessage( { cmd: "execComplete", data: {} } );
}

const buildDependencies = function () {
  return [
    { url: '/node_modules/three/build/three.min.js' },
    { code: 'const hello = "Hello World!";' }
  ]
}

const taskName = 'InlineWorker';
this.workerTaskManager.registerTaskType(taskName, init, execute, null, false, buildDependencies());
await this.workerTaskManager.initTaskType(taskName, { name: taskName })
    .then( () => this.workerTaskManager.enqueueForExecution( taskName, {}, null))
    .then( data => processData(data) )
    .catch( e => console.error( e ) );
```

This is the same block required for a module Worker. The worker code resides in an extra file an contains all imports and exports required:
```javascript
const taskNameModule = 'ModuleWorker';
this.workerTaskManager.registerTaskTypeModule('myModuleTask', '/examples/worker/helloWorldWorker.js');
await this.workerTaskManager.initTaskType(taskNameModule, {})
    .then( () => this.workerTaskManager.enqueueForExecution( taskName, {}, null))
    .then( data => processData(data) )
    .catch( e => console.error( e ) );
    
```
The examples above are fully specified and used in [wtm_helloworld.html](public/examples/wtm_helloworld.html").

# Bundling

Rollup is used to create the libraries that are contained in the deployed npm package.
Just run `npm run build`

## Local library test environment

Rollup is also used to create local test environments where the library and uglified library are used by the examples.
Use `npm run prerelease` to build the libraries and the test environment. Inside both `build/verify` or `build/verifymin` you find a npm package.json and snowpack configuration that allows to serve everything. Run `npm run dev`. The example then use the packages library. 


Happy coding!

Kai




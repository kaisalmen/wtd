# three-wtm
**WorkerTaskManager for three.js**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/three-wtm/blob/main/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/three-wtm)

***This README is being updated for 1.0.0 release...***

# Quick Overview 
The `WorkerTaskManager` allows to register tasks expressed by an initialization, and an execution function with an optional comRounting function to be run in a web worker. It creates one to a maximum number of workers that can be used for execution. Multiple execution requests can be handled in parallel of the main task, If all workers are currently occupied the requested are enqueued, and the returned promise is fulfilled once a worker becomes available again.

# Getting Started

There exist three possibilities:
* Press the `Gitpod` button above and start coding and using the examples directly in the browser
* Checkout the repository and use `docker-compose` to spin up local snowpack dev server
* Checkout the repository and run `npm install` and then `npm run dev` to spin up local snowpack dev server

Whatever environment you choose to start [snowpack](https://www.snowpack.dev/) is used to serve the code and the examples using it. With this setup you are able to change the code and examples without invoking an additional bundler. Snowpack ensures all imported npm modules are available if previously installed in local environment (see `npm install`).

**TODO: code example**

**TODO: rollup is used for building the bundle**

**TODO: Describe local bundle (regular&minified) test env**

# Features

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

Happy coding!

Kai




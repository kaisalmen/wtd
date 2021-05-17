# three-wtm
**WorkerTaskManager for three.js**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/kaisalmen/three-wtm/blob/main/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/kaisalmen/three-wtm)

***This README is WIP...***

# Quick Overview 
The `WorkerTaskManager` allows to register a task expressed by an initialization and an execution function with an optional comRounting function to be run a web worker. It creates one to a maximum number of workers that can be used for execution. Multiple execution requests can be handled in parallel of the main task, If all workers are currently occupied the requested are enqueued and the returned promise is fulfilled once a worker becomes available again.

# Getting Started

There exist three possibilities:
* Press the `Gitpod` button above and start coding and using the examples directly in the browser
* Checkout the repository and use `docker-compose` to spin up local snowpack dev server
* Checkout the repository and run `npm install` and then `npm run dev` to spin up local snowpack dev server

Kai

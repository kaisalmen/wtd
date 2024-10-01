# Changelog

## 3.1.0 - 2024-10-01

- ComChannelEndpoint has been extracted from WorkerTask
  - Now Worker, MessageChannel or DedicatedWorkerGlobalScope can be channel endpoints. Both ends of the communication channel can use the same implementation to send message and await responses if needed.
  - Added new example **HelloWorldComChannelEndpoint**

## 3.0.0 - 2024-01-05

- Make the worker lifecylce no longer mandatory if not using `WorkerTaskDirector`.
- Sent message with or without awaiting them.
  - `WorkerTask` keeps track of messages that need to be awaited.
- API clean-up and code improvements:
  - `WorkerTask` contains async code improvements and it keeps track of outstanding messages (new)
  - Use configuration objects instead of long number of arguments
  - Move static functions of classes to independent funtions
  - Better function and class names
- Added helper functions for creating an OffscreenCanvas and delegating events to the worker.
- Extracted `Payload` from `DataPayload` and created `RawPayload` for supporting plain messages.
- Added offscreen canvas related functionality and utilities:
  - Provide framework independent worker and message payload extensions (`OffscreenWorker` and `OffscreenPayload`) (**wtd-core**)
  - `MainEventProxy` allows configurable event delegation to a Worker (**wtd-core**)
  - `ElementProxyReceiver` can be used to simulate a canvas in a Worker (**wtd-three-ext**)
- Added new example [Inter-Worker Communication](https://github.com/kaisalmen/wtd/blob/main/packages/examples/src/com/WorkerCom.ts) that demonstrates communication between workers utilizing message channels.

## 2.3.0 - 2023-10-21

- Added the possiblity to sent intermediate message from main to the worker if the worker is still executing.
- Usage of `await` everwhere instead of `Promise.then()`
- Moved `WorkerTaskWorker` to its own file
- Code Cleanup
- Updated dependencies

## 2.2.0

- `DataPayload#applyProperties` allows any object as input and the params are more relaxed. A first set of uit tests has been introduced.
- Set compiler `target` and `module` to `ES2020`. `moduleResolution` is now `Node16` instead of `Node`,

## 2.1.0

- Export an esm bundle along with raw code
- Use `import type` for importing type definitions

## 2.0.0

- Completely transform the source code from JavaScript to TypeScript
- Switch from snowpack to vitejs
- Clean-up and uncluttering
  - Remove all code related to worker online assembly and minification workarounds
  - Code is better organized into blocks with specific purpose that are combined to achieve the overall functionality
- Fully rely on module workers. Use vite config to generate standard workers from module workers at build time
- Renamed and split package `three-wtm` into `wtd-core` (core without any dependencies) and `wtd-three-ext` (Payload extension for three.js)
- `WorkerTaskMessage` is now properly defined and provides a header and multiple payloads. Payloads can be extended from the base `DataPayload`/`DataPayloadType`
- `WorkerTask`: Handles worker registration, initialization and execution and can be used independently of the `WorkerTaskDirector`
- `WorkerTaskDirector`:
  - It is now possible to define different number of workers for each registered task, execution queue depletion is performed according the configuration (workerExecutionPlans)
  - The depletion code has been rewritten and Promise handling has been fixed

## 1.1.0

- Added the possibility to load a non-module worker from a URL. Triggered by https://github.com/kaisalmen/WWOBJLoader/issues/60
- Updated example wtm_helloworld.html to reflect how this is done.
- Updated formatting of files

## 1.0.1

- `three.js` is no longer a **peerDependency**. It is just a **dependency**.
- Updated **devDependencies** to resolve potential security issues.

## 1.0.0

- Initial public release.

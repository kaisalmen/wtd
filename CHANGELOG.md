# Changelog

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

# Changelog

## 2.0.0-beta.0

- Completely transform the source code to TypeScript
- Switch from snowpack to vitejs
- Clean-up and uncluttering
  - Remove all code related to worker online assembly and minification workarounds
- Fully rely on module workers. Use vite config to generate standard workers from module workers at build time
- Renamed and split package `three-wtm` into `wtd-core` (core without any dependencies) and `wtd-three-ext` (Payload extension for three.js)
- It is now possible to define different number of workers for each worker task
- Worker Task is now completely self-standing and independent of `WorkerTaskDirector`


## 1.1.0
- Added the possibility to load a non-module worker from a URL. Triggered by https://github.com/kaisalmen/WWOBJLoader/issues/60
- Updated example wtm_helloworld.html to reflect how this is done.
- Updated formatting of files

## 1.0.1
- `three.js` is no longer a **peerDependency**. It is just a **dependency**.
- Updated **devDependencies** to resolve potential security issues.

## 1.0.0
- Initial public release.

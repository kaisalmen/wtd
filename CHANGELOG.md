# Changelog

## 2.0.0-next.0

- Completely transform the source code to TypeScript
- Switch from snowpack to vitejs
- Clean-up and uncluttering
  - Remove all code related to worker online assembly and minification workarounds
- Fully rely on module workers. Use vite config to generate standard workers from module workers at build time

## 1.1.0
- Added the possibility to load a non-module worker from a URL. Triggered by https://github.com/kaisalmen/WWOBJLoader/issues/60
- Updated example wtm_helloworld.html to reflect how this is done.
- Updated formatting of files

## 1.0.1
- `three.js` is no longer a **peerDependency**. It is just a **dependency**.
- Updated **devDependencies** to resolve potential security issues.

## 1.0.0
- Initial public release.

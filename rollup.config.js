import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { name, dependencies, devDependencies } from './package.json';

// transformation instructions: Required to verify examples work with bundled lib
const patternWorkerTaskManager = new RegExp('../../dist/loaders/workerTaskManager/WorkerTaskManager.js', 'g');
const patternTransportUtils = new RegExp('../../dist/loaders/utils/TransportUtils.js', 'g');
const patternMaterialUtils = new RegExp('../../dist/loaders/utils/MaterialUtils.js', 'g');
const patternMaterialStore = new RegExp('../../dist/loaders/utils/MaterialStore.js', 'g');
const patternDefaultRouting = new RegExp('../../dist/loaders/workerTaskManager/worker/defaultRouting.js', 'g');

const packageModule = `../libs/three-wtm/${name}.module.js`;
const packageModuleWorker = `../../libs/three-wtm/${name}.module.js`;

const copyConfig = {
  targets: [
    { src: 'public/index.html', dest: 'build/verify/public' },
    {
      src: 'public/examples/wtm_transferables.html',
      dest: 'build/verify/public/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternWorkerTaskManager, packageModule);
        return str.replace(patternTransportUtils, packageModule);
      }
    },
    {
      src: 'public/examples/webgl_loader_workertaskmanager.html',
      dest: 'build/verify/public/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternWorkerTaskManager, packageModule);
        str = str.replace(patternTransportUtils, packageModule);
        str = str.replace(patternMaterialUtils, packageModule);
        return str.replace(patternMaterialStore, packageModule);
      }
    },
    {
      src: 'dev/verify/snowpack.config.js',
      dest: 'build/verify'
    },
    {
      src: 'public/examples/main.css',
      dest: 'build/verify/public/examples'
    },
    {
      src: 'public/examples/models/*',
      dest: 'build/verify/public/examples/models/'
    },
    {
      src: 'public/examples/worker/*',
      dest: 'build/verify/public/examples/worker/',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternDefaultRouting, packageModuleWorker);
        str = str.replace(patternMaterialUtils, packageModuleWorker);
        return str.replace(patternTransportUtils, packageModuleWorker);
      }
    },
    {
      src: 'node_modules/three',
      dest: 'build/verify/libs'
    }
  ]
};

export default [
  // everything in one package
  {
    input: 'src/index.js',
    output: [
      {
        format: 'cjs',
        file: `build/${name}.common.js`,
        exports: 'auto'
      },
      {
        format: 'cjs',
        file: `build/${name}.common.min.js`,
        exports: 'auto',
        plugins: [terser()]
      },
      {
        format: 'es',
        file: `build/${name}.module.js`,
      },
      {
        format: 'es',
        file: `build/${name}.module.min.js`,
        plugins: [terser()]
      }
    ],
    external: [ ...Object.keys(dependencies), ...Object.keys(devDependencies) ],
    plugins: [
      resolve(),
      babel(),
      copy(copyConfig),
    ]
  }
];

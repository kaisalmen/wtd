import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { name, dependencies, devDependencies } from './package.json';

const copyConfig = {
  targets: buildCopyConfig(false).concat(buildCopyConfig(true)),
  hook: 'closeBundle'
};

function buildCopyConfig(min) {
  const basedir = min ? 'build/verifymin' : 'build/verify';
  const examplesDir = basedir + '/public/examples';
  const snowpackConfig = min ? 'dev/verify/min/snowpack.config.js' : 'dev/verify/snowpack.config.js';
  const moduleReplacer = min ? '../libs/three-wtm/three-wtm.module.min.js' : '../libs/three-wtm/three-wtm.module.js';
  const moduleReplacerWorker = min ? '../../libs/three-wtm/three-wtm.module.min.js' : '../../libs/three-wtm/three-wtm.module.js';

  // transformation instructions: Required to verify examples work with bundled lib
  const patternWorkerTaskManager = new RegExp('../../dist/loaders/workerTaskManager/WorkerTaskManager.js', 'g');
  const patternTransportUtils = new RegExp('../../dist/loaders/utils/TransportUtils.js', 'g');
  const patternMaterialUtils = new RegExp('../../dist/loaders/utils/MaterialUtils.js', 'g');
  const patternMaterialStore = new RegExp('../../dist/loaders/utils/MaterialStore.js', 'g');
  const patternDefaultRouting = new RegExp('../../dist/loaders/workerTaskManager/worker/defaultRouting.js', 'g');
  return [
    {
      src: 'public/index.html',
      dest: basedir + '/public'
    },
    {
      src: 'public/examples/wtm_transferables.html',
      dest: examplesDir,
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternWorkerTaskManager, moduleReplacer);
        return str.replace(patternTransportUtils, moduleReplacer);
      }
    },
    {
      src: 'public/examples/webgl_loader_workertaskmanager.html',
      dest: examplesDir,
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternWorkerTaskManager, moduleReplacer);
        str = str.replace(patternTransportUtils, moduleReplacer);
        str = str.replace(patternMaterialUtils, moduleReplacer);
        return str.replace(patternMaterialStore, moduleReplacer);
      }
    },
    {
      src: snowpackConfig,
      dest: basedir
    },
    {
      src: 'public/examples/main.css',
      dest: examplesDir
    },
    {
      src: 'public/examples/models/*',
      dest: examplesDir + '/models/'
    },
    {
      src: 'public/examples/worker/*',
      dest: examplesDir + '/worker/',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternDefaultRouting, moduleReplacerWorker);
        str = str.replace(patternMaterialUtils, moduleReplacerWorker);
        return str.replace(patternTransportUtils, moduleReplacerWorker);
      }
    },
    {
      src: 'node_modules/three',
      dest: basedir + '/libs'
    },
    {
      src: min ? 'build/three-wtm.module.min.js' : 'build/three-wtm.module.js',
      dest: basedir + '/libs/three-wtm'
    }
  ]
}

const terserConfig = {
  keep_classnames: true,
  module: true
}

export default [
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
        plugins: [
            terser()
        ]
      },
      {
        format: 'esm',
        file: `build/${name}.module.js`,
      },
      {
        format: 'esm',
        file: `build/${name}.module.min.js`,
        plugins: [
            terser()
        ]
      }
    ],
    external: [ ...Object.keys(dependencies), ...Object.keys(devDependencies) ],
    plugins: [
      resolve(),
      babel(),
      copy(copyConfig)
    ],
  }
];

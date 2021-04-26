import babel from '@rollup/plugin-babel';
import copy from 'rollup-plugin-copy';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import { name, dependencies, devDependencies } from './package.json';

// transformation instructions
const patternWorkerTaskManager = new RegExp('../../src/loaders/workerTaskManager/WorkerTaskManager.js', 'g');
const patternTransportUtils = new RegExp('../../src/loaders/utils/TransportUtils.js', 'g');
const packageModule = '../npm/wwobjloader2.module.js';

const copyConfig = {
  targets: [
    { src: 'public/index.html', dest: 'build/public' },
    {
      src: 'public/examples/wtm_transferables.html',
      dest: 'build/public/examples',
      transform: (contents, filename) => {
        let str = contents.toString();
        str = str.replace(patternWorkerTaskManager, packageModule);
        return str.replace(patternTransportUtils, packageModule);
      }
    },
    {
      src: 'dev/build/snowpack.config.js',
      dest: 'build'
    },
    {
      src: 'public/examples/main.css',
      dest: 'build/public/examples'
    },
    {
      src: 'public/models/obj/female02/*',
      dest: 'build/public/examples/models/obj/female02'
    }
  ]
};

export default [
  // everything in one package
  {
    input: 'src/index.js',
    output: [
      /*
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
	  */
      {
        format: 'es',
        file: `build/npm/${name}.module.js`,
      },
      {
        format: 'es',
        file: `build/npm/${name}.module.min.js`,
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

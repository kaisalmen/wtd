import shell from 'shelljs';

shell.mkdir('-p', './src/worker/generated');
shell.cp('-f', '../../node_modules/wwobjloader2/lib/worker/OBJLoader2Worker*.js', './src/worker/generated');

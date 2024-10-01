import shell from 'shelljs';

shell.rm('-f', './src/worker/generated/HelloWorldWorker*.js');
shell.exec('vite -c build/vite.config.HelloWorldWorker.ts build');

shell.rm('-f', './src/worker/generated/HelloWorldComChannelEndpointWorker*.js');
shell.exec('vite -c build/vite.config.HelloWorldComChannelEndpointWorker.ts build');

shell.rm('-f', './src/worker/generated/Com1Worker*.js');
shell.exec('vite -c build/vite.config.Com1Worker.ts build');

shell.rm('-f', './src/worker/generated/Com2Worker*.js');
shell.exec('vite -c build/vite.config.Com2Worker.ts build');

shell.rm('-f', './src/worker/generated/HelloWorldThreeWorker*.js');
shell.exec('vite -c build/vite.config.HelloWorldThreeWorker.ts build');

shell.rm('-f', './src/worker/generated/InfiniteWorkerExternalGeometry*.js');
shell.exec('vite -c build/vite.config.InfiniteWorkerExternalGeometry.ts build');

shell.rm('-f', './src/worker/generated/InfiniteWorkerInternalGeometry*.js');
shell.exec('vite -c build/vite.config.InfiniteWorkerInternalGeometry.ts build');

shell.rm('-f', './src/worker/generated/OBJLoaderWorker*.js');
shell.exec('vite -c build/vite.config.OBJLoaderWorker.ts build');

shell.rm('-f', './src/worker/generated/TransferableWorkerTest1*.js');
shell.exec('vite -c build/vite.config.TransferableWorkerTest1.ts build');

shell.rm('-f', './src/worker/generated/TransferableWorkerTest2*.js');
shell.exec('vite -c build/vite.config.TransferableWorkerTest2.ts build');

shell.rm('-f', './src/worker/generated/TransferableWorkerTest3*.js');
shell.exec('vite -c build/vite.config.TransferableWorkerTest3.ts build');

shell.rm('-f', './src/worker/generated/TransferableWorkerTest4*.js');
shell.exec('vite -c build/vite.config.TransferableWorkerTest4.ts build');

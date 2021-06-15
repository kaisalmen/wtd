#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)
DIR_LOADER_SRC=${DIR_BASE}/build/ts
DIR_LOADER_TRG=${DIR_BASE}/src

rm -fr ${DIR_LOADER_SRC}
mkdir -p ${DIR_LOADER_SRC}

tsc -p ${DIR_ME}/declaration.tsconfig.json

cp -f ${DIR_LOADER_SRC}/index.d.ts ${DIR_LOADER_TRG}/index.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/utils/TransportUtils.d.ts ${DIR_LOADER_TRG}/loaders/utils/TransportUtils.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/utils/MaterialUtils.d.ts ${DIR_LOADER_TRG}/loaders/utils/MaterialUtils.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/utils/MaterialStore.d.ts ${DIR_LOADER_TRG}/loaders/utils/MaterialStore.d.ts

cp -f ${DIR_LOADER_SRC}/loaders/workerTaskManager/WorkerTaskManager.d.ts ${DIR_LOADER_TRG}/loaders/workerTaskManager/WorkerTaskManager.d.ts
cp -f ${DIR_LOADER_SRC}/loaders/workerTaskManager/worker/defaultRouting.d.ts ${DIR_LOADER_TRG}/loaders/workerTaskManager/worker/defaultRouting.d.ts

#!/bin/bash

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/..)
DIR_LOADER_SRC=${DIR_BASE}/bundle/ts
DIR_LOADER_TRG=${DIR_BASE}/src/loaders

rm -fr ${DIR_LOADER_SRC}
mkdir -p ${DIR_LOADER_SRC}

tsc -p ${DIR_ME}/declaration.tsconfig.json

cp -f ${DIR_LOADER_SRC}/utils/TransportUtils.d.ts ${DIR_LOADER_TRG}/utils/TransportUtils.d.ts
cp -f ${DIR_LOADER_SRC}/utils/MaterialUtils.d.ts ${DIR_LOADER_TRG}/utils/MaterialUtils.d.ts
cp -f ${DIR_LOADER_SRC}/utils/MaterialStore.d.ts ${DIR_LOADER_TRG}/utils/MaterialStore.d.ts

cp -f ${DIR_LOADER_SRC}/workerTaskManager/WorkerTaskManager.d.ts ${DIR_LOADER_TRG}/workerTaskManager/WorkerTaskManager.d.ts
cp -f ${DIR_LOADER_SRC}/workerTaskManager/worker/defaultRouting.d.ts ${DIR_LOADER_TRG}/workerTaskManager/worker/defaultRouting.d.ts

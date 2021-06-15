#!/bin/bash

# This script copies local changes to the three.js repository checkout residing in a parallel directory.

DIR_ME=$(realpath $(dirname ${0}))
DIR_BASE=$(realpath ${DIR_ME}/../..)
DIR_THREE=${DIR_BASE}/../three.js

cp -fv ${DIR_BASE}/public/examples/webgl_loader_workertaskmanager.html ${DIR_THREE}/examples/webgl_loader_workertaskmanager.html
cp -fv ${DIR_BASE}/public/examples/worker/tmOBJLoader.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/worker/tmOBJLoader.js

cp -fv ${DIR_BASE}/src/loaders/workerTaskManager/WorkerTaskManager.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/WorkerTaskManager.js
cp -fv ${DIR_BASE}/src/loaders/workerTaskManager/worker/defaultRouting.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/worker/defaultRouting.js

cp -fv ${DIR_BASE}/src/loaders/utils/MaterialStore.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/utils/MaterialStore.js
cp -fv ${DIR_BASE}/src/loaders/utils/MaterialUtils.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/utils/MaterialUtils.js
cp -fv ${DIR_BASE}/src/loaders/utils/TransportUtils.js ${DIR_THREE}/examples/jsm/loaders/workerTaskManager/utils/TransportUtils.js

cp -fv ${DIR_BASE}/public/examples/models/female02_vertex_colors.obj ${DIR_THREE}/examples/models/obj/female02/female02_vertex_colors.obj


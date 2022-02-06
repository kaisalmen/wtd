class WorkerTaskManagerDefaultRouting {

    static comRouting(context, message, object, initFunction, executeFunction) {
        let payload = message.data;
        if (payload.cmd === 'init') {
            if (object !== undefined && object !== null) {
                object[initFunction](context, payload.workerId, payload.config);
            }
            else {
                initFunction(context, payload.workerId, payload.config);
            }
        }
        else if (payload.cmd === 'execute') {
            if (object !== undefined && object !== null) {
                object[executeFunction](context, payload.workerId, payload.config);
            }
            else {
                executeFunction(context, payload.workerId, payload.config);
            }
        }
    }

}

const TransferableWorkerTest1 = {

    init: function(context, id, config) {
        context.postMessage({ cmd: "init", id: id });
    },

    execute: function(context, id, config) {
        const test1 = {
            cmd: 'executeComplete',
            data: new Uint32Array(32 * 1024 * 1024)
        }
        context.postMessage(test1);
    }

}

self.addEventListener('message', message => WorkerTaskManagerDefaultRouting.comRouting(self, message, TransferableWorkerTest1, 'init', 'execute'), false);

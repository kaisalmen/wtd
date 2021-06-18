import { SphereBufferGeometry } from 'three';
import { WorkerTaskManagerDefaultRouting } from '/src/loaders/workerTaskManager/worker/defaultRouting.js';
import { MeshTransport } from '/src/loaders/utils/TransportUtils.js';

const init = function ( context, id, config ) {
	context.postMessage( { cmd: "init",	id: id	} );
};

const execute = function ( context, id, config ) {
	let bufferGeometry = new SphereBufferGeometry( 40, 64, 64 );
	bufferGeometry.name = config.name + config.id;
	let vertexArray = bufferGeometry.getAttribute( 'position' ).array;
	for ( let i = 0; i < vertexArray.length; i ++ ) vertexArray[ i ] = vertexArray[ i ] * Math.random() * 0.48;
	new MeshTransport( 'execComplete', config.id )
		.setGeometry( bufferGeometry, 0 )
		.package( false )
		.postMessage( context );
}

self.addEventListener( 'message', message => WorkerTaskManagerDefaultRouting.comRouting( self, message, null, init, execute ), false );

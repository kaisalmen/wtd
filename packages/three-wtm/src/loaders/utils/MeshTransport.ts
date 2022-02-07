import { BufferGeometry, Mesh } from 'three';
import { buildDataTransport, setParams } from './DataTransport';
import { GeometryTransportDef, packageBuffer, reconstructBuffer } from './GeometryTransport';
import { MaterialsTransport } from './MaterialsTransport';

export type MeshTransportDef = GeometryTransportDef & {
    meshName: string | undefined;
    materialsTransport: MaterialsTransport;
};

export function buildGeometryTransport(cmd?: string, id?: number): MeshTransportDef {
    const meshTransportDef = buildDataTransport('MeshTransport', cmd, id) as MeshTransportDef;
    meshTransportDef.geometryType = 0;
    meshTransportDef.geometry = {};
    meshTransportDef.bufferGeometry = undefined;
    meshTransportDef.meshName = undefined;
    meshTransportDef.materialsTransport = new MaterialsTransport();
    return meshTransportDef;
}

/**
 * Define a structure that is used to send mesh data between main and workers.
 */
export class MeshTransport {

    private main: MeshTransportDef;
    private transferables: ArrayBuffer[];

    /**
     * Creates a new {@link MeshTransport}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.main = buildGeometryTransport(cmd, id);
        this.transferables = [];
    }

    /**
     * @param {MeshTransportDef} transportObject
     * @return {MeshTransport}
     */
    loadData(transportObject: MeshTransportDef) {
        this.main = buildGeometryTransport(transportObject.cmd, transportObject.id);
        this.main.meshName = transportObject.meshName;
        if (transportObject.materialsTransport) {
            this.main.materialsTransport = new MaterialsTransport().loadData(transportObject.materialsTransport.getMaterialsTransportDef());
        }
        return this;
    }

    /**
     * @param {Record<string, unknown>} params
     * @return {MeshTransport}
     */
    setParams(params: Record<string, unknown>): MeshTransport {
        setParams(this.main.params, params);
        return this;
    }

    /**
     * The {@link MaterialsTransport} wraps all info regarding the material for the mesh.
     * @param {MaterialsTransport} materialsTransport
     * @return {MeshTransport}
     */
    setMaterialsTransport(materialsTransport: MaterialsTransport) {
        this.main.materialsTransport = materialsTransport;
        return this;
    }

    /**
     * @return {MaterialsTransport}
     */
    getMaterialsTransport(): MaterialsTransport {
        return this.main.materialsTransport;
    }

    /**
     * Sets the mesh and the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @param {Mesh} mesh
     * @param {number} geometryType
     * @return {MeshTransport}
     */
    setMesh(mesh: Mesh, geometryType: 0 | 1 | 2) {
        this.main.meshName = mesh.name;
        this.main.geometry = mesh.geometry;
        this.main.geometryType = geometryType;
        if (mesh.geometry instanceof BufferGeometry) this.main.bufferGeometry = mesh.geometry;
        return this;
    }

    /**
     * @param {boolean} cloneBuffers
     * @return {MeshTransport}
     */
    package(cloneBuffers: boolean): MeshTransport {
        packageBuffer(cloneBuffers, this.main.buffers, this.transferables, this.main.geometry);
        if (this.main.materialsTransport !== null) this.main.materialsTransport.package(cloneBuffers);
        return this;
    }

    /**
     * @param {boolean} cloneBuffers
     * @return {MeshTransport}
     */
    reconstruct(cloneBuffers: boolean): MeshTransport {
        reconstructBuffer(cloneBuffers, this.main.bufferGeometry, this.main.geometry);
        // so far nothing needs to be done for material
        return this;
    }

}

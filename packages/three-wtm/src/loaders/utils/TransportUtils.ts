import {
    BufferGeometry,
    BufferAttribute,
    Box3,
    Sphere,
    Texture,
    Material,
    MaterialLoader
} from 'three';
import { MaterialCloneInstructions, MaterialUtils } from './MaterialUtils';

type DataTransportDef = {
    cmd: string;
    id: number;
    type: string;
    progress: number;
    buffers: Map<string, ArrayBuffer>;
    params: unknown;
};

export function buildDataTransport(type: string, cmd?: string, id?: number): DataTransportDef {
    return {
        cmd: (cmd !== undefined) ? cmd : 'unknown',
        id: (id !== undefined) ? id : 0,
        type: type,
        progress: 0,
        buffers: new Map(),
        params: {
        }
    };
}

function copyBuffers(input: Map<string, ArrayBuffer>, output: ArrayBuffer[], cloneBuffers: boolean) {
    for (const buffer of Object.values(input)) {
        if (buffer !== null && buffer !== undefined) {
            const potentialClone = cloneBuffers ? buffer.slice(0) : buffer;
            output.push(potentialClone);
        }
    }
}

/**
 * Define a base structure that is used to ship data in between main and workers.
 */
class DataTransport {

    private main: DataTransportDef;
    private transferables: ArrayBuffer[];

    /**
     * Creates a new {@link DataTransport}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.main = buildDataTransport('DataTransport', cmd, id);
        this.transferables = [];
    }

    /**
     * Populate this object with previously serialized data.
     * @param {DataTransportDef} transportObject
     * @return {DataTransport}
     */
    loadData(transportObject: DataTransportDef): DataTransport {
        this.main = buildDataTransport('DataTransport', transportObject.cmd, transportObject.id)
        this.setProgress(transportObject.progress);
        this.setParams(transportObject.params);

        if (transportObject.buffers) {
            Object.entries(transportObject.buffers).forEach(([name, buffer]) => {
                this.main.buffers.set(name, buffer);
            });
        }
        return this;
    }

    /**
     * Returns the value of the command.
     * @return {string}
     */
    getCmd(): string {
        return this.main.cmd;
    }

    /**
     * Returns the id.
     * @return {number}
     */
    getId(): number {
        return this.main.id;
    }

    /**
     * Set a parameter object which is a map with string keys and strings or objects as values.
     * @param {unknown} params
     * @return {DataTransport}
     */
    setParams(params: unknown): DataTransport {
        if (params !== null && params !== undefined) {
            this.main.params = params;
        }
        return this;
    }

    /**
     * Return the parameter object
     * @return {unknown}
     */
    getParams(): unknown {
        return this.main.params;
    }

    /**
     * Set the current progress (e.g. percentage of progress)
     * @param {number} numericalValue
     * @return {DataTransport}
     */
    setProgress(numericalValue: number): DataTransport {
        this.main.progress = numericalValue;
        return this;
    }

    /**
     * Add a named {@link ArrayBuffer}
     * @param {string} name
     * @param {ArrayBuffer} buffer
     * @return {DataTransport}
     */
    addBuffer(name: string, buffer: ArrayBuffer): DataTransport {
        this.main.buffers.set(name, buffer);
        return this;
    }

    /**
     * Retrieve an {@link ArrayBuffer} by name
     * @param {string} name
     * @return {ArrayBuffer}
     */
    getBuffer(name: string) {
        return this.main.buffers.get(name);
    }

    /**
     * Package all data buffers into the transferable array. Clone if data needs to stay in current context.
     * @param {boolean} cloneBuffers
     * @return {DataTransport}
     */
    package(cloneBuffers: boolean): DataTransport {
        copyBuffers(this.main.buffers, this.transferables, cloneBuffers);
        return this;
    }

    /**
     * Return main data object
     * @return {DataTransportDef}
     */
    getMain(): DataTransportDef {
        return this.main;
    }

    /**
     * Return all transferable in one array.
     * @return {ArrayBuffer[]}
     */
    getTransferables(): ArrayBuffer[] {
        return this.transferables;
    }
}

type MaterialsTransportDef = DataTransportDef & {
    materials: Map<string, Material>;
    materialsJson: Map<string, unknown>;
    multiMaterialNames: Map<number, string>;
    cloneInstructions: MaterialCloneInstructions[];
};

export function buildMaterialsTransport(cmd?: string, id?: number): MaterialsTransportDef {
    const materialsTransportDef = buildDataTransport('MaterialsTransport', cmd, id) as MaterialsTransportDef;
    materialsTransportDef.materials = new Map();
    materialsTransportDef.multiMaterialNames = new Map();
    materialsTransportDef.cloneInstructions = [];
    return materialsTransportDef;
}

/**
 * Define a structure that is used to ship materials data between main and workers.
 */
class MaterialsTransport {

    private main: MaterialsTransportDef;
    private transferables: ArrayBuffer[];

    /**
     * Creates a new {@link MeshMessageStructure}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.main = buildMaterialsTransport(cmd, id);
        this.transferables = [];
    }

    /**
     * @param {MaterialsTransportDef} transportObject
     * @return {MaterialsTransport}
     */
    loadData(transportObject: MaterialsTransportDef): MaterialsTransport {
        this.main = buildMaterialsTransport(transportObject.cmd, transportObject.id);
        for (const entry of transportObject.multiMaterialNames.entries()) {
            this.main.multiMaterialNames.set(entry[0], entry[1]);
        }
        for (const cloneInstruction of transportObject.cloneInstructions) {
            this.main.cloneInstructions.push(cloneInstruction);
        }
        this.main.cloneInstructions = transportObject.cloneInstructions;

        const materialLoader = new MaterialLoader();
        for (const entry of transportObject.materialsJson.entries()) {
            this.main.materials.set(entry[0], materialLoader.parse(entry[1]));
        }
        return this;
    }

    _cleanMaterial(material: Material): Material {
        Object.entries(material).forEach(([key, value]) => {
            if (value instanceof Texture || value === null) {
                // TODO: clean
                //material[key] = undefined;
            }
        });
        return material;
    }

    /**
     * @param {string} name
     * @param {ArrayBuffer} buffer
     * @return {MaterialsTransport}
     */
    addBuffer(name: string, buffer: ArrayBuffer): MaterialsTransport {
        this.main.buffers.set(name, buffer);
        return this;
    }

    /**
     * @param {unknown} params
     * @return {MaterialsTransport}
     */
    setParams(params: unknown): MaterialsTransport {
        if (params !== null && params !== undefined) {
            this.main.params = params;
        }
        return this;
    }

    /**
     * Set an object containing named materials.
     * @param {Map<string, Material>} materials
     */
    setMaterials(materials: Map<string, Material>): MaterialsTransport {
        for (const entry of materials.entries()) {
            this.main.materials.set(entry[0], entry[1]);
        }
        return this;
    }

    /**
     * Returns all materials
     * @return {Map<string, Material>}
     */
    getMaterials(): Map<string, Material> {
        return this.main.materials;
    }

    /**
     * Removes all textures and null values from all materials
     */
    cleanMaterials(): MaterialsTransport {
        const clonedMaterials = new Map();
        for (const material of Object.values(this.main.materials)) {
            if (typeof material.clone === 'function') {
                const clonedMaterial = material.clone();
                clonedMaterials.set(clonedMaterial.name, this._cleanMaterial(clonedMaterial));
            }
        }
        this.setMaterials(clonedMaterials);
        return this;
    }

    /**
     * See {@link DataTransport#package}
     * @param {boolean} cloneBuffers
     * @return {DataTransport}
     */
    package(cloneBuffers: boolean) {
        copyBuffers(this.main.buffers, this.transferables, cloneBuffers);
        this.main.materialsJson = MaterialUtils.getMaterialsJSON(this.main.materials);
        return this;
    }

    /**
     * Tell whether a multi-material was defined
     * @return {boolean}
     */
    hasMultiMaterial() {
        return (Object.keys(this.main.multiMaterialNames).length > 0);
    }

    /**
     * Returns a single material if it is defined or null.
     * @return {Material|null}
     */
    getSingleMaterial() {
        if (Object.keys(this.main.materials).length > 0) {
            return Object.entries(this.main.materials)[0][1];
        } else {
            return null;
        }
    }

    /**
     * Adds contained material or multi-material the provided materials object or it clones and adds new materials according clone instructions.
     *
     * @param {Map<string, Material>} materials
     * @param {boolean} log
     *
     * @return {Material|Material[]}
     */
    processMaterialTransport(materials: Map<string, Material>, log?: boolean): Material | undefined | Material[] | undefined[] {
        for (const cloneInstruction of this.main.cloneInstructions) {
            MaterialUtils.cloneMaterial(materials, cloneInstruction, log);
        }
        if (this.hasMultiMaterial()) {
            // multi-material
            const outputMaterials: Material[] | undefined[] = [];
            for (const entry of this.main.multiMaterialNames.entries()) {
                const mat = materials.get(entry[1]);
                outputMaterials[entry[0]] = mat ? mat : undefined;
            }
            return outputMaterials;
        }
        else {
            const singleMaterial = this.getSingleMaterial();
            if (singleMaterial !== null) {
                const outputMaterial = materials.get(singleMaterial.name);
                return outputMaterial ? outputMaterial : singleMaterial;
            }
        }
        return undefined;
    }
}

/**
 * Define a structure that is used to send geometry data between main and workers.
 */
class GeometryTransport extends DataTransport {

    /**
     * Creates a new {@link GeometryTransport}.
     * @param {string} [cmd]
     * @param {string} [id]
     */
    constructor(cmd, id) {
        super(cmd, id);
        this.main.type = 'GeometryTransport';
        // 0: mesh, 1: line, 2: point
        /** @type {number} */
        this.main.geometryType = 0;
        /** @type {object} */
        this.main.geometry = {};
        /** @type {BufferGeometry} */
        this.main.bufferGeometry = null;
    }

    /**
     * See {@link DataTransport#loadData}
     * @param {object} transportObject
     * @return {GeometryTransport}
     */
    loadData(transportObject) {
        super.loadData(transportObject);
        this.main.type = 'GeometryTransport';
        return this.setGeometry(transportObject.geometry, transportObject.geometryType);
    }

    /**
     * Returns the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @return {number}
     */
    getGeometryType() {
        return this.main.geometryType;
    }

    /**
     * See {@link DataTransport#setParams}
     * @param {object} params
     * @return {GeometryTransport}
     */
    setParams(params) {
        super.setParams(params);
        return this;
    }

    /**
     * Set the {@link BufferGeometry} and geometry type that can be used when a mesh is created.
     *
     * @param {BufferGeometry} geometry
     * @param {number} geometryType [0=Mesh|1=LineSegments|2=Points]
     * @return {GeometryTransport}
     */
    setGeometry(geometry, geometryType) {
        this.main.geometry = geometry;
        this.main.geometryType = geometryType;
        if (geometry instanceof BufferGeometry) this.main.bufferGeometry = geometry;

        return this;
    }

    /**
     * Package {@link BufferGeometry} and prepare it for transport.
     *
     * @param {boolean} cloneBuffers Clone buffers if their content shall stay in the current context.
     * @return {GeometryTransport}
     */
    package(cloneBuffers) {
        super.package(cloneBuffers);
        const vertexBA = this.main.geometry.getAttribute('position');
        const normalBA = this.main.geometry.getAttribute('normal');
        const uvBA = this.main.geometry.getAttribute('uv');
        const colorBA = this.main.geometry.getAttribute('color');
        const skinIndexBA = this.main.geometry.getAttribute('skinIndex');
        const skinWeightBA = this.main.geometry.getAttribute('skinWeight');
        const indexBA = this.main.geometry.getIndex();

        this._addBufferAttributeToTransferable(vertexBA, cloneBuffers);
        this._addBufferAttributeToTransferable(normalBA, cloneBuffers);
        this._addBufferAttributeToTransferable(uvBA, cloneBuffers);
        this._addBufferAttributeToTransferable(colorBA, cloneBuffers);
        this._addBufferAttributeToTransferable(skinIndexBA, cloneBuffers);
        this._addBufferAttributeToTransferable(skinWeightBA, cloneBuffers);
        this._addBufferAttributeToTransferable(indexBA, cloneBuffers);
        return this;
    }

    /**
     * Reconstructs the {@link BufferGeometry} from the raw buffers.
     * @param {boolean} cloneBuffers
     * @return {GeometryTransport}
     */
    reconstruct(cloneBuffers) {
        if (this.main.bufferGeometry instanceof BufferGeometry) return this;
        this.main.bufferGeometry = new BufferGeometry();

        const transferredGeometry = this.main.geometry;
        this._assignAttribute(transferredGeometry.attributes.position, 'position', cloneBuffers);
        this._assignAttribute(transferredGeometry.attributes.normal, 'normal', cloneBuffers);
        this._assignAttribute(transferredGeometry.attributes.uv, 'uv', cloneBuffers);
        this._assignAttribute(transferredGeometry.attributes.color, 'color', cloneBuffers);
        this._assignAttribute(transferredGeometry.attributes.skinIndex, 'skinIndex', cloneBuffers);
        this._assignAttribute(transferredGeometry.attributes.skinWeight, 'skinWeight', cloneBuffers);

        const index = transferredGeometry.index;
        if (index !== null && index !== undefined) {
            const indexBuffer = cloneBuffers ? index.array.slice(0) : index.array;
            this.main.bufferGeometry.setIndex(new BufferAttribute(indexBuffer, index.itemSize, index.normalized));
        }
        const boundingBox = transferredGeometry.boundingBox;
        if (boundingBox !== null) this.main.bufferGeometry.boundingBox = Object.assign(new Box3(), boundingBox);

        const boundingSphere = transferredGeometry.boundingSphere;
        if (boundingSphere !== null) this.main.bufferGeometry.boundingSphere = Object.assign(new Sphere(), boundingSphere);

        this.main.bufferGeometry.uuid = transferredGeometry.uuid;
        this.main.bufferGeometry.name = transferredGeometry.name;
        this.main.bufferGeometry.type = transferredGeometry.type;
        this.main.bufferGeometry.groups = transferredGeometry.groups;
        this.main.bufferGeometry.drawRange = transferredGeometry.drawRange;
        this.main.bufferGeometry.userData = transferredGeometry.userData;
        return this;
    }

    /**
     * Returns the {@link BufferGeometry}.
     * @return {BufferGeometry|null}
     */
    getBufferGeometry() {
        return this.main.bufferGeometry;
    }

    _addBufferAttributeToTransferable(input, cloneBuffer) {
        if (input !== null && input !== undefined) {
            const arrayBuffer = cloneBuffer ? input.array.slice(0) : input.array;
            this.transferables.push(arrayBuffer.buffer);
        }
        return this;
    }

    _assignAttribute(attr, attrName, cloneBuffer) {
        if (attr) {
            const arrayBuffer = cloneBuffer ? attr.array.slice(0) : attr.array;
            this.main.bufferGeometry.setAttribute(attrName, new BufferAttribute(arrayBuffer, attr.itemSize, attr.normalized));
        }
        return this;
    }

}


/**
 * Define a structure that is used to send mesh data between main and workers.
 */
class MeshTransport extends GeometryTransport {

    /**
     * Creates a new {@link MeshTransport}.
     * @param {string} [cmd]
     * @param {string} [id]
     */
    constructor(cmd, id) {
        super(cmd, id);
        this.main.type = 'MeshTransport';
        // needs to be added as we cannot inherit from both materials and geometry
        this.main.materialsTransport = new MaterialsTransport();
    }

    /**
     * See {@link GeometryTransport#loadData}
     * @param {object} transportObject
     * @return {MeshTransport}
     */
    loadData(transportObject) {
        super.loadData(transportObject);
        this.main.type = 'MeshTransport';
        this.main.meshName = transportObject.meshName;
        this.main.materialsTransport = new MaterialsTransport().loadData(transportObject.materialsTransport.main);
        return this;
    }

    /**
     * See {@link GeometryTransport#loadData}
     * @param {object} params
     * @return {MeshTransport}
     */
    setParams(params) {
        super.setParams(params);
        return this;
    }

    /**
     * The {@link MaterialsTransport} wraps all info regarding the material for the mesh.
     * @param {MaterialsTransport} materialsTransport
     * @return {MeshTransport}
     */
    setMaterialsTransport(materialsTransport) {
        if (materialsTransport instanceof MaterialsTransport) this.main.materialsTransport = materialsTransport;
        return this;
    }

    /**
     * @return {MaterialsTransport}
     */
    getMaterialsTransport() {
        return this.main.materialsTransport;
    }

    /**
     * Sets the mesh and the geometry type [0=Mesh|1=LineSegments|2=Points]
     * @param {Mesh} mesh
     * @param {number} geometryType
     * @return {MeshTransport}
     */
    setMesh(mesh, geometryType) {
        this.main.meshName = mesh.name;
        super.setGeometry(mesh.geometry, geometryType);
        return this;
    }

    /**
     * See {@link GeometryTransport#package}
     * @param {boolean} cloneBuffers
     * @return {MeshTransport}
     */
    package(cloneBuffers) {
        super.package(cloneBuffers);
        if (this.main.materialsTransport !== null) this.main.materialsTransport.package(cloneBuffers);
        return this;
    }

    /**
     * See {@link GeometryTransport#reconstruct}
     * @param {boolean} cloneBuffers
     * @return {MeshTransport}
     */
    reconstruct(cloneBuffers) {
        super.reconstruct(cloneBuffers);
        // so far nothing needs to be done for material
        return this;
    }

}

/**
 * Object manipulation utilities.
 */
class ObjectManipulator {

    /**
     * Applies values from parameter object via set functions or via direct assignment.
     *
     * @param {Object} objToAlter The objToAlter instance
     * @param {Object} params The parameter object
     * @param {boolean} forceCreation Force the creation of a property
     */
    static applyProperties(objToAlter, params, forceCreation) {
        // fast-fail
        if (objToAlter === undefined || objToAlter === null || params === undefined || params === null) return;

        let property, funcName, values;
        for (property in params) {
            funcName = 'set' + property.substring(0, 1).toLocaleUpperCase() + property.substring(1);
            values = params[property];

            if (typeof objToAlter[funcName] === 'function') {
                objToAlter[funcName](values);
            }
            else if (objToAlter.hasOwnProperty(property) || forceCreation) {
                objToAlter[property] = values;
            }
        }
    }

}

export {
    DataTransport,
    GeometryTransport,
    MeshTransport,
    MaterialsTransport,
    ObjectManipulator
}

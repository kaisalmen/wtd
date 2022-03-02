import { Material, MaterialLoader, Texture } from 'three';
import { MaterialCloneInstructions, MaterialUtils } from './MaterialUtils';
import { PayloadType } from '../..';
import { DataTransportPayload } from './DataTransport';

export type MaterialsTransportPayloadType = PayloadType & {
    materials: Map<string, Material>;
    materialsJson: Map<string, unknown>;
    multiMaterialNames: Map<number, string>;
    cloneInstructions: MaterialCloneInstructions[];
};

export class MaterialsTransportPayload extends DataTransportPayload implements MaterialsTransportPayloadType {

    type = 'MaterialsTransportPayload';
    materials: Map<string, Material> = new Map();
    materialsJson: Map<string, unknown> = new Map();
    multiMaterialNames: Map<number, string> = new Map();
    cloneInstructions: MaterialCloneInstructions[] = [];

    constructor(cmd?: string, id?: number) {
        super(cmd, id);
    }

    package(cloneBuffers: boolean): { payload: MaterialsTransportPayloadType, transferables: Transferable[] } {
        const transferables: Transferable[] = [];
        this.fillTransferables(this.buffers.values(), transferables, cloneBuffers);
        this.materialsJson = MaterialUtils.getMaterialsJSON(this.materials);
        return {
            payload: this,
            transferables: transferables
        }
    }
}

/**
 * Define a structure that is used to ship materials data between main and workers.
 */
export class MaterialsTransport {

    private payload: MaterialsTransportPayload;

    /**
     * Creates a new {@link MeshMessageStructure}.
     * @param {string} [cmd]
     * @param {number} [id]
     */
    constructor(cmd?: string, id?: number) {
        this.payload = new MaterialsTransportPayload(cmd, id);
    }

    /**
     * @param {MaterialsTransportDef} transportObject
     * @return {MaterialsTransport}
     */
    loadData(transportObject: MaterialsTransportPayload): MaterialsTransportPayload {
        this.payload = new MaterialsTransportPayload(transportObject.cmd, transportObject.id);
        for (const entry of transportObject.multiMaterialNames.entries()) {
            this.payload.multiMaterialNames.set(entry[0], entry[1]);
        }
        for (const cloneInstruction of transportObject.cloneInstructions) {
            this.payload.cloneInstructions.push(cloneInstruction);
        }
        this.payload.cloneInstructions = transportObject.cloneInstructions;

        const materialLoader = new MaterialLoader();
        for (const entry of transportObject.materialsJson.entries()) {
            this.payload.materials.set(entry[0], materialLoader.parse(entry[1]));
        }
        return this.payload;
    }

    getMaterialsTransportDef(): MaterialsTransportPayload {
        return this.payload;
    }

    private cleanMaterial(material: Material): Material {
        const objToAlter = material as unknown as Record<string, unknown>;
        for (const [k, v] of Object.entries(objToAlter)) {
            if ((v instanceof Texture || v === null) && Object.prototype.hasOwnProperty.call(material, k)) {
                objToAlter[k] = undefined;
            }
        }
        return material;
    }

    /**
     * @param {string} name
     * @param {ArrayBuffer} buffer
     * @return {MaterialsTransport}
     */
    addBuffer(name: string, buffer: ArrayBuffer): MaterialsTransport {
        this.payload.buffers.set(name, buffer);
        return this;
    }

    /**
      * @param {Record<string, unknown>} params
      * @return {MaterialsTransport}
      */
    setParams(params: Record<string, unknown>): MaterialsTransport {
        this.payload.params = params;
        return this;
    }

    /**
     * Set an object containing named materials.
     * @param {Map<string, Material>} materials
     */
    setMaterials(materials: Map<string, Material>): MaterialsTransport {
        for (const entry of materials.entries()) {
            this.payload.materials.set(entry[0], entry[1]);
        }
        return this;
    }

    /**
     * Returns all materials
     * @return {Map<string, Material>}
     */
    getMaterials(): Map<string, Material> {
        return this.payload.materials;
    }

    /**
     * Removes all textures and null values from all materials
     */
    cleanMaterials(): MaterialsTransport {
        const clonedMaterials = new Map();
        for (const material of Object.values(this.payload.materials)) {
            if (typeof material.clone === 'function') {
                const clonedMaterial = material.clone();
                clonedMaterials.set(clonedMaterial.name, this.cleanMaterial(clonedMaterial));
            }
        }
        this.setMaterials(clonedMaterials);
        return this;
    }

    /**
     * @param {boolean} cloneBuffers
     * @return {DataTransport}
     */
    package(cloneBuffers: boolean): { payload: MaterialsTransportPayloadType, transferables: Transferable[] } {
        return this.payload.package(cloneBuffers);
    }

    /**
     * Tell whether a multi-material was defined
     * @return {boolean}
     */
    hasMultiMaterial() {
        return (Object.keys(this.payload.multiMaterialNames).length > 0);
    }

    /**
     * Returns a single material if it is defined or null.
     * @return {Material|null}
     */
    getSingleMaterial() {
        if (Object.keys(this.payload.materials).length > 0) {
            return Object.entries(this.payload.materials)[0][1];
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
        for (const cloneInstruction of this.payload.cloneInstructions) {
            MaterialUtils.cloneMaterial(materials, cloneInstruction, log);
        }
        if (this.hasMultiMaterial()) {
            // multi-material
            const outputMaterials: Material[] | undefined[] = [];
            for (const entry of this.payload.multiMaterialNames.entries()) {
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

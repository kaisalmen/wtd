import { Material, MaterialLoader, Texture } from 'three';
import { MaterialCloneInstructions, MaterialUtils } from './MaterialUtils';
import { buildDataTransport, copyBuffers, DataTransportDef, setParams } from './DataTransport';

export type MaterialsTransportDef = DataTransportDef & {
    materials: Map<string, Material>;
    materialsJson: Map<string, unknown>;
    multiMaterialNames: Map<number, string>;
    cloneInstructions: MaterialCloneInstructions[];
};

function buildMaterialsTransport(cmd?: string, id?: number): MaterialsTransportDef {
    const materialsTransportDef = buildDataTransport('MaterialsTransport', cmd, id) as MaterialsTransportDef;
    materialsTransportDef.materials = new Map();
    materialsTransportDef.multiMaterialNames = new Map();
    materialsTransportDef.cloneInstructions = [];
    return materialsTransportDef;
}

/**
 * Define a structure that is used to ship materials data between main and workers.
 */
export class MaterialsTransport {

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

    getMaterialsTransportDef(): MaterialsTransportDef {
        return this.main;
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
        this.main.buffers.set(name, buffer);
        return this;
    }

    /**
      * @param {Record<string, unknown>} params
      * @return {MaterialsTransport}
      */
    setParams(params: Record<string, unknown>): MaterialsTransport {
        setParams(this.main.params, params);
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

import type {
    AssociatedArrayType,
    DataPayloadType,
    PayloadHandlerType
} from 'wtd-core';
import {
    DataPayloadHandler,
    DataPayload,
    PayloadRegister
} from 'wtd-core';
import type {
    MaterialCloneInstructionsType
} from './MaterialUtils.js';
import {
    MaterialUtils
} from './MaterialUtils.js';
import {
    Material,
    MaterialLoader,
    Texture
} from 'three';

export type MaterialsPayloadType = DataPayloadType & {
    materials: Map<string, Material>;
    materialsJson: Map<string, unknown>;
    multiMaterialNames: Map<number, string>;
    cloneInstructions: MaterialCloneInstructionsType[];
};

export class MaterialsPayload extends DataPayload implements MaterialsPayloadType {

    type = 'MaterialsPayload';
    materials: Map<string, Material> = new Map();
    materialsJson: Map<string, unknown> = new Map();
    multiMaterialNames: Map<number, string> = new Map();
    cloneInstructions: MaterialCloneInstructionsType[] = [];

    /**
     * Set an object containing named materials.
     * @param {Map<string, Material>} materials
     */
    setMaterials(materials: Map<string, Material>): void {
        for (const [k, v] of materials.entries()) {
            this.materials.set(k, v);
        }
    }

    /**
    * Removes all textures and null values from all materials
    */
    cleanMaterials(): void {
        const clonedMaterials = new Map();
        for (const material of this.materials.values()) {
            if (typeof material.clone === 'function') {
                const clonedMaterial = material.clone();
                clonedMaterials.set(clonedMaterial.name, this.cleanMaterial(clonedMaterial));
            }
        }
        this.materials = clonedMaterials;
    }

    private cleanMaterial(material: Material): Material {
        const objToAlter = material as unknown as AssociatedArrayType<unknown>;
        for (const [k, v] of Object.entries(objToAlter)) {
            if ((v instanceof Texture || v === null) && Object.prototype.hasOwnProperty.call(material, k)) {
                objToAlter[k] = undefined;
            }
        }
        return material;
    }

    /**
      * Tell whether a multi-material was defined
      * @return {boolean}
      */
    hasMultiMaterial() {
        return this.multiMaterialNames.size > 0;
    }

    /**
     * Returns a single material if it is defined or null.
     * @return {Material|null}
     */
    getSingleMaterial() {
        return this.materials.size > 0 ? this.materials.values().next().value as Material : undefined;
    }

    /**
     * Adds contained material or multi-material the provided materials object or it clones and adds new materials according clone instructions.
     *
     * @param {Map<string, Material>} materials
     * @param {boolean} log
     *
     * @return {Material|Material[]|undefined}
     */
    processMaterialTransport(materials: Map<string, Material>, log?: boolean) {
        for (const cloneInstruction of this.cloneInstructions) {
            MaterialUtils.cloneMaterial(materials, cloneInstruction, log);
        }
        if (this.hasMultiMaterial()) {
            // multi-material
            const outputMaterials: Material[] = [];
            for (const [k, v] of this.multiMaterialNames.entries()) {
                const mat = materials.get(v);
                if (mat) {
                    outputMaterials[k] = mat;
                }
            }
            return outputMaterials;
        }
        else {
            const singleMaterial = this.getSingleMaterial();
            if (singleMaterial) {
                const outputMaterial = materials.get(singleMaterial.name);
                return outputMaterial ? outputMaterial : singleMaterial;
            }
        }
        return undefined;
    }
}

/**
 * Define a structure that is used to ship materials data between main and workers.
 */
export class MaterialsPayloadHandler implements PayloadHandlerType {

    static pack(payload: MaterialsPayload, transferables: Transferable[], cloneBuffers: boolean) {
        const handler = PayloadRegister.handler.get('MaterialsPayload');
        return handler ? handler.pack(payload, transferables, cloneBuffers) : undefined;
    }

    pack(payload: MaterialsPayload, transferables: Transferable[], cloneBuffers: boolean) {
        DataPayloadHandler.fillTransferables(payload.buffers.values(), transferables, cloneBuffers);
        payload.materialsJson = MaterialUtils.getMaterialsJSON(payload.materials);
        return transferables;
    }

    static unpack(transportObject: MaterialsPayloadType, cloneBuffers: boolean) {
        const handler = PayloadRegister.handler.get('MaterialsPayload');
        return handler ? handler.unpack(transportObject, cloneBuffers) : undefined;
    }

    unpack(transportObject: MaterialsPayloadType, cloneBuffers: boolean) {
        const materialsPayload = Object.assign(new MaterialsPayload(), transportObject);
        DataPayloadHandler.unpack(transportObject, cloneBuffers);

        for (const [k, v] of transportObject.multiMaterialNames.entries()) {
            materialsPayload.multiMaterialNames.set(k, v);
        }

        const materialLoader = new MaterialLoader();
        for (const [k, v] of transportObject.materialsJson.entries()) {
            materialsPayload.materials.set(k, materialLoader.parse(v));
        }
        return materialsPayload;
    }
}

// register the Materials related payload handler
PayloadRegister.handler.set('MaterialsPayload', new MaterialsPayloadHandler());

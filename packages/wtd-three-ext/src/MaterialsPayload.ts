import type {
    AssociatedArrayType,
    ParameterizedMessage,
    Payload,
    PayloadHandler
} from 'wtd-core';
import {
    DataPayloadHandler,
    PayloadRegister,
    fillTransferables
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

export type MaterialsPayloadAdditions = Payload & {
    message: MaterialsPayloadMessageAdditions
};

export type MaterialsPayloadMessageAdditions = ParameterizedMessage & {
    materials: Map<string, Material>;
    materialsJson: Map<string, unknown>;
    multiMaterialNames: Map<number, string>;
    cloneInstructions: MaterialCloneInstructionsType[];
}

export class MaterialsPayload implements MaterialsPayloadAdditions {

    $type = 'MaterialsPayload';
    message: MaterialsPayloadMessageAdditions = {
        buffers: new Map(),
        params: {},
        materials: new Map(),
        materialsJson: new Map(),
        multiMaterialNames: new Map(),
        cloneInstructions: []
    };

    /**
     * Set an object containing named materials.
     * @param {Map<string, Material>} materials
     */
    setMaterials(materials: Map<string, Material>): void {
        for (const [k, v] of materials.entries()) {
            this.message.materials.set(k, v);
        }
    }

    /**
    * Removes all textures and null values from all materials
    */
    cleanMaterials(): void {
        const clonedMaterials = new Map();
        for (const material of this.message.materials.values()) {
            if (typeof material.clone === 'function') {
                const clonedMaterial = material.clone();
                clonedMaterials.set(clonedMaterial.name, this.cleanMaterial(clonedMaterial));
            }
        }
        this.message.materials = clonedMaterials;
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
        return this.message.multiMaterialNames.size > 0;
    }

    /**
     * Returns a single material if it is defined or null.
     * @return {Material|null}
     */
    getSingleMaterial() {
        return this.message.materials.size > 0 ? this.message.materials.values().next().value as Material : undefined;
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
        for (const cloneInstruction of this.message.cloneInstructions) {
            MaterialUtils.cloneMaterial(materials, cloneInstruction, log);
        }
        if (this.hasMultiMaterial()) {
            // multi-material
            const outputMaterials: Material[] = [];
            for (const [k, v] of this.message.multiMaterialNames.entries()) {
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

export class MaterialsPayloadHandler implements PayloadHandler {

    pack(payload: Payload, transferables: Transferable[], cloneBuffers: boolean) {
        const mp = payload as MaterialsPayload;
        if (mp.message.buffers) {
            fillTransferables(mp.message.buffers.values(), transferables, cloneBuffers);
        }
        mp.message.materialsJson = MaterialUtils.getMaterialsJSON(mp.message.materials);
        return transferables;
    }

    unpack(transportObject: Payload, cloneBuffers: boolean) {
        const mp = transportObject as MaterialsPayload;
        const materialsPayload = Object.assign(new MaterialsPayload(), transportObject);
        new DataPayloadHandler().unpack(mp, cloneBuffers);

        for (const [k, v] of mp.message.multiMaterialNames.entries()) {
            materialsPayload.message.multiMaterialNames.set(k, v);
        }

        const materialLoader = new MaterialLoader();
        for (const [k, v] of mp.message.materialsJson.entries()) {
            materialsPayload.message.materials.set(k, materialLoader.parse(v));
        }
        return materialsPayload;
    }
}

// register the Materials related payload handler
PayloadRegister.handler.set('MaterialsPayload', new MaterialsPayloadHandler());

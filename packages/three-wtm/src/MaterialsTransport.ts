import { Material, MaterialLoader, Texture } from 'three';
import { MaterialCloneInstructions, MaterialUtils } from './MaterialUtils';
import { PayloadType } from './WorkerTaskManager';
import { DataTransportPayload, DataTransportPayloadUtils } from './DataTransport';

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

}

/**
 * Define a structure that is used to ship materials data between main and workers.
 */
export class MaterialsTransportPayloadUtils {

    static packMaterialsTransportPayload(payload: MaterialsTransportPayload, cloneBuffers: boolean): { payload: MaterialsTransportPayloadType, transferables: Transferable[] } {
        const transferables: Transferable[] = [];
        DataTransportPayloadUtils.fillTransferables(payload.buffers.values(), transferables, cloneBuffers);
        payload.materialsJson = MaterialUtils.getMaterialsJSON(payload.materials);

        return {
            payload: payload,
            transferables: transferables
        };
    }

    /**
     * @param {MaterialsTransportDef} transportObject
     * @return {MaterialsTransport}
     */
    static unpackMaterialsTransportPayload(payload: MaterialsTransportPayload, transportObject: MaterialsTransportPayload) {
        for (const [k, v] of transportObject.multiMaterialNames.entries()) {
            payload.multiMaterialNames.set(k, v);
        }
        for (const cloneInstruction of transportObject.cloneInstructions) {
            payload.cloneInstructions.push(cloneInstruction);
        }
        payload.cloneInstructions = transportObject.cloneInstructions;

        const materialLoader = new MaterialLoader();
        for (const [k, v] of transportObject.materialsJson.entries()) {
            payload.materials.set(k, materialLoader.parse(v));
        }
    }

    /**
     * Set an object containing named materials.
     * @param {Map<string, Material>} materials
     */
    static setMaterials(payload: MaterialsTransportPayload, materials: Map<string, Material>): void {
        for (const [k, v] of materials.entries()) {
            payload.materials.set(k, v);
        }
    }

    /**
     * Removes all textures and null values from all materials
     */
    static cleanMaterials(payload: MaterialsTransportPayload): void {
        const clonedMaterials = new Map();
        for (const material of payload.materials.values()) {
            if (typeof material.clone === 'function') {
                const clonedMaterial = material.clone();
                clonedMaterials.set(clonedMaterial.name, MaterialsTransportPayloadUtils.cleanMaterial(clonedMaterial));
            }
        }
        payload.materials = clonedMaterials;
    }

    static cleanMaterial(material: Material): Material {
        const objToAlter = material as unknown as Record<string, unknown>;
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
    static hasMultiMaterial(payload: MaterialsTransportPayload) {
        return payload.multiMaterialNames.size > 0;
    }

    /**
     * Returns a single material if it is defined or null.
     * @return {Material|null}
     */
    static getSingleMaterial(payload: MaterialsTransportPayload) {
        return payload.materials.size > 0 ? payload.materials.values().next().value as Material : undefined;
    }

    /**
     * Adds contained material or multi-material the provided materials object or it clones and adds new materials according clone instructions.
     *
     * @param {Map<string, Material>} materials
     * @param {boolean} log
     *
     * @return {Material|Material[]|undefined}
     */
    static processMaterialTransport(payload: MaterialsTransportPayload, materials: Map<string, Material>, log?: boolean) {
        if (!payload) {
            return undefined;
        }

        for (const cloneInstruction of payload.cloneInstructions) {
            MaterialUtils.cloneMaterial(materials, cloneInstruction, log);
        }
        if (MaterialsTransportPayloadUtils.hasMultiMaterial(payload)) {
            // multi-material
            const outputMaterials: Material[] = [];
            for (const [k, v] of payload.multiMaterialNames.entries()) {
                const mat = materials.get(v);
                if (mat) {
                    outputMaterials[k] = mat;
                }
            }
            return outputMaterials;
        }
        else {
            const singleMaterial = MaterialsTransportPayloadUtils.getSingleMaterial(payload);
            if (singleMaterial) {
                const outputMaterial = materials.get(singleMaterial.name);
                return outputMaterial ? outputMaterial : singleMaterial;
            }
        }
        return undefined;
    }
}

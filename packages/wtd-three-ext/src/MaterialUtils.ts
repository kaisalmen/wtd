import { Material } from 'three';

export type MaterialCloneInstructionsType = {
    materialNameOrg: string,
    materialProperties: {
        name: string,
        vertexColors: number,
        flatShading: boolean
    }
};

/**
 * Static functions useful in the context of handling materials.
 */
export class MaterialUtils {

    /**
     * Adds the provided material to the provided map of materials if the material does not exists.
     * Use force override existing material.
     *
     * @param {Map<string, Material>} materialsObject
     * @param {string} materialName
     * @param {Material} material
     * @param {boolean} force Enforce addition of provided material
     * @param {boolean} [log] Log messages to the console
     */
    static addMaterial(materialsObject: Map<string, Material>, materialName: string, material: Material,
        force: boolean, log?: boolean) {
        let existingMaterial;
        // ensure materialName is set
        material.name = materialName;
        if (!force) {
            existingMaterial = materialsObject.get(materialName);
            if (existingMaterial) {
                if (existingMaterial.uuid !== existingMaterial.uuid) {
                    if (log === true) console.log('Same material name "' + existingMaterial.name + '" different uuid [' + existingMaterial.uuid + '|' + material.uuid + ']');
                }
            }
            else {
                materialsObject.set(materialName, material);
                if (log === true) console.info('Material with name "' + materialName + '" was added.');
            }
        }
        else {
            materialsObject.set(materialName, material);
            if (log === true) console.info('Material with name "' + materialName + '" was forcefully overridden.');
        }
    }

    /**
     * Transforms the named materials object to an object with named jsonified materials.
     *
     * @param {Map<string, Material>}
     * @returns {Map<string, unknown>} Map of Materials in JSON representation
     */
    static getMaterialsJSON(materialsObject: Map<string, Material>): Map<string, unknown> {
        const materialsJSON: Map<string, unknown> = new Map();
        for (const entry of materialsObject.entries()) {
            if (typeof entry[1].toJSON === 'function') {
                materialsJSON.set(entry[0], entry[1].toJSON());
            }
        }
        return materialsJSON;
    }

    /**
     * Clones a material according the provided instructions.
     *
     * @param {Map<string, Material>} materials
     * @param {MaterialCloneInstructionsType} materialCloneInstruction
     * @param {boolean} [log]
     */
    static cloneMaterial(materials: Map<string, Material>, materialCloneInstruction: MaterialCloneInstructionsType, log?: boolean): Material | undefined {

        const materialNameOrg = materialCloneInstruction.materialNameOrg;
        const materialOrg = materials.get(materialNameOrg);
        if (materialOrg) {
            const material = materialOrg.clone();
            Object.assign(material, materialCloneInstruction.materialProperties);
            MaterialUtils.addMaterial(materials, materialCloneInstruction.materialProperties.name, material, true, log);
            return material;
        }
        else {
            if (log === true) console.info('Requested material "' + materialNameOrg + '" is not available!');
            return undefined;
        }
    }

}

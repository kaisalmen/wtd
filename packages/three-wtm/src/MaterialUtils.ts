import { Material } from 'three';

type MaterialCloneInstructions = {
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
class MaterialUtils {

    /**
     * Adds the provided material to the provided materials object if the material does not exists.
     * Use force override existing material.
     *
     * @param {Map<string, Material>} materialsObject
     * @param {Material} material
     * @param {string} materialName
     * @param {boolean} force
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
                    if (log) console.log('Same material name "' + existingMaterial.name + '" different uuid [' + existingMaterial.uuid + '|' + material.uuid + ']');
                }
            }
            else {
                materialsObject.set(materialName, material);
                if (log) console.info('Material with name "' + materialName + '" was added.');
            }
        }
        else {
            materialsObject.set(materialName, material);
            if (log) console.info('Material with name "' + materialName + '" was forcefully overridden.');
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
     * @param {MaterialCloneInstructions} materialCloneInstruction
     * @param {boolean} [log]
     */
    static cloneMaterial(materials: Map<string, Material>, materialCloneInstruction: MaterialCloneInstructions, log?: boolean): Material | undefined {
        if (materialCloneInstruction) {
            let materialNameOrg = materialCloneInstruction.materialNameOrg;
            materialNameOrg = (materialNameOrg !== undefined && materialNameOrg !== null) ? materialNameOrg : '';
            const materialOrg = materials.get(materialNameOrg);
            if (materialOrg) {
                const material = materialOrg.clone();
                Object.assign(material, materialCloneInstruction.materialProperties);
                MaterialUtils.addMaterial(materials, materialCloneInstruction.materialProperties.name, material, true, log);
                return material;
            }
            else {
                if (log) console.info('Requested material "' + materialNameOrg + '" is not available!');
            }
        }
        return undefined;
    }

}

export { MaterialUtils, MaterialCloneInstructions };

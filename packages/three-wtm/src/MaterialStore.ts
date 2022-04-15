import { MaterialUtils } from './MaterialUtils.js';
import {
    MeshStandardMaterial,
    LineBasicMaterial,
    PointsMaterial,
    Material
} from 'three';

/**
 * Helper class around an object storing materials by name.
 * Optionally, create and store default materials.
 */
export class MaterialStore {

    private materials: Map<string, Material>;

    /**
     * Creates a new {@link MaterialStore}.
     * @param {boolean} createDefaultMaterials
     */
    constructor(createDefaultMaterials: boolean) {
        this.materials = new Map();
        if (createDefaultMaterials) {
            const defaultMaterial = new MeshStandardMaterial({ color: 0xDCF1FF });
            defaultMaterial.name = 'defaultMaterial';

            const defaultVertexColorMaterial = new MeshStandardMaterial({ color: 0xDCF1FF });
            defaultVertexColorMaterial.name = 'defaultVertexColorMaterial';
            defaultVertexColorMaterial.vertexColors = true;

            const defaultLineMaterial = new LineBasicMaterial();
            defaultLineMaterial.name = 'defaultLineMaterial';

            const defaultPointMaterial = new PointsMaterial({ size: 0.1 });
            defaultPointMaterial.name = 'defaultPointMaterial';

            this.materials.set(defaultMaterial.name, defaultMaterial);
            this.materials.set(defaultVertexColorMaterial.name, defaultVertexColorMaterial);
            this.materials.set(defaultLineMaterial.name, defaultLineMaterial);
            this.materials.set(defaultPointMaterial.name, defaultPointMaterial);
        }
    }

    /**
     * Set materials loaded by any supplier of an Array of {@link Material}.
     *
     * @param {Map<string, Material>} newMaterials Object with named {@link Material}
     * @param {boolean} forceOverrideExisting boolean Override existing material
     */
    addMaterials(newMaterials: Map<string, Material>, forceOverrideExisting: boolean) {
        if (newMaterials && newMaterials !== null && newMaterials.size > 0) {
            for (const entry of newMaterials.entries()) {
                MaterialUtils.addMaterial(this.materials, entry[0], entry[1], forceOverrideExisting === true);
            }
        }
    }

    addMaterialsFromObject(newMaterials: Record<string, Material>, forceOverrideExisting: boolean) {
        if (newMaterials && newMaterials !== null && Object.keys(newMaterials).length > 0) {
            for (const [k, v] of Object.entries(newMaterials)) {
                MaterialUtils.addMaterial(this.materials, k, v, forceOverrideExisting === true);
            }
        }
    }


    /**
     * Returns the mapping object of material name and corresponding material.
     *
     * @returns {Map<string, Material>}
     */
    getMaterials(): Map<string, Material> {
        return this.materials;
    }

    /**
     *
     * @param {String} materialName
     * @returns {Material}
     */
    getMaterial(materialName: string): Material | undefined {
        return this.materials.get(materialName);
    }

    /**
     * Removes all materials
     */
    clearMaterials() {
        this.materials.clear();
    }

}

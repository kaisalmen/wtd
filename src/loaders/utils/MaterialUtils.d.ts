export class MaterialUtils {
    static addMaterial(materialsObject: object<string, Material>, material: Material, materialName: string, force: boolean, log?: boolean | undefined): void;
    static getMaterialsJSON(materialsObject: any): Object;
    static cloneMaterial(materials: object<string, Material>, materialCloneInstruction: object, log?: boolean | undefined): any;
}

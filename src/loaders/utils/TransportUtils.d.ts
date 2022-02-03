export class DataTransport {
    constructor(cmd?: string | undefined, id?: string | undefined);
    main: {
        cmd: string;
        id: string | number;
        type: string;
        progress: number;
        buffers: {};
        params: {};
    };
    transferables: ArrayBuffer[];
    loadData(transportObject: object): DataTransport;
    getCmd(): string;
    getId(): string;
    setParams(params: object<string, any>): DataTransport;
    getParams(): object<string, any>;
    setProgress(numericalValue: number): DataTransport;
    addBuffer(name: string, buffer: ArrayBuffer): DataTransport;
    getBuffer(name: string): ArrayBuffer;
    package(cloneBuffers: boolean): DataTransport;
    getMain(): object;
    getTransferables(): ArrayBuffer[];
    postMessage(postMessageImpl: object): DataTransport;
}
export class GeometryTransport extends DataTransport {
    getGeometryType(): number;
    setGeometry(geometry: BufferGeometry, geometryType: number): GeometryTransport;
    reconstruct(cloneBuffers: boolean): GeometryTransport;
    getBufferGeometry(): BufferGeometry | null;
    _addBufferAttributeToTransferable(input: any, cloneBuffer: any): GeometryTransport;
    _assignAttribute(attr: any, attrName: any, cloneBuffer: any): GeometryTransport;
}
export class MeshTransport extends GeometryTransport {
    setMaterialsTransport(materialsTransport: MaterialsTransport): MeshTransport;
    getMaterialsTransport(): MaterialsTransport;
    setMesh(mesh: Mesh, geometryType: number): MeshTransport;
}
export class MaterialsTransport extends DataTransport {
    _cleanMaterial(material: any): any;
    setMaterials(materials: object<string, Material>): MaterialsTransport;
    getMaterials(): object<string, Material>;
    cleanMaterials(): MaterialsTransport;
    hasMultiMaterial(): boolean;
    getSingleMaterial(): Material | null;
    processMaterialTransport(materials: {
        [x: string]: Material;
    }, log: boolean): Material | Material[];
}
export class ObjectUtils {
    static serializePrototype(targetClass: any, targetPrototype: any, fullObjectName: any, processPrototype: any): string;
    static serializeClass(targetClass: object): string;
}
export class ObjectManipulator {
    static applyProperties(objToAlter: Object, params: Object, forceCreation: boolean): void;
}
export class DeUglify {
    static buildThreeConst(): string;
    static buildUglifiedThreeMapping(): string;
    static buildUglifiedThreeWtmMapping(): string;
    static buildUglifiedNameAssignment(func: any, name: any, methodPattern: any, invert: any): string;
}

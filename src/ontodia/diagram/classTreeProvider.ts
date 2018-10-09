import { FatClassModel } from './elements';
import { ElementTypeIri } from '../data/model';

export class СlassTreeProvider {
    constructor() { this.classes = []; }
    public classes: Array<FatClassModel>;

    public addClass(element: FatClassModel) {
        this.classes.push(element);
    }

    public getClass(id: ElementTypeIri): FatClassModel {
        return this.classes.find(arrayClass => (arrayClass.id === id));
    }

    public cycle(base: FatClassModel, id: ElementTypeIri): boolean {
        if (base && this.getClass(id).base && this.getClass(id).base.id !== base.id) {
            return false;
        } else if (this.getClass(id).base === undefined && base !== undefined) {
            return false;
        } else {
            return true;
        }
    }
}

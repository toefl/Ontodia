import * as React from 'react';

import { FatClassModel } from '../diagram/elements';
import { formatLocalizedLabel } from '../diagram/model';
import { Node } from './node';

export interface Props {
    roots?: ReadonlyArray<FatClassModel>;
    expanded?: boolean;
    classesToDisplay?: Array<FatClassModel>;
    searchString?: string;
    lang?: Readonly<string>;
    onClassSelected: (classId: string) => void;
}

const CLASS_NAME = 'ontodia-class-tree';

export class TreeNodes extends React.Component<Props, {}> {
    public static defaultProps: Partial<Props> = {
        expanded: true
    };

    constructor(props: Props) {
        super(props);
        this.filter = this.filter.bind(this);
        this.compare = this.compare.bind(this);
    }

    filter(root: FatClassModel): boolean {
        const { classesToDisplay } = this.props;
        if (classesToDisplay && classesToDisplay.length > 0) {
            return Boolean(classesToDisplay.find(resultRoot => resultRoot === root));
        } else {
            return true;
        }
    }

    compare(node1: FatClassModel, node2: FatClassModel) {
        const classLabel1 = formatLocalizedLabel(node1.id, node1.label, this.props.lang);
        const classLabel2 = formatLocalizedLabel(node2.id, node2.label, this.props.lang);
        return classLabel1 < classLabel2 ? -1 : 1;
    }

    private getRenderRoots() {
        let roots;
        roots = this.props.roots && this.props.roots.filter(this.filter).sort(this.compare);
        return roots;
    }

    render() {
        const { expanded, classesToDisplay, searchString, lang, onClassSelected } = this.props;
        const roots = this.getRenderRoots();

        return (
            <ul className={`${CLASS_NAME}__elements`} style={{ display: expanded ? 'block' : 'none' }}>
                {roots && roots.map(element => (
                    <div key={`node-${element.id}`}>
                        <Node node={element} classesToDisplay={classesToDisplay} searchString={searchString}
                            onClassSelected={onClassSelected} lang={lang} />
                    </div>
                ))}
            </ul>
        );
    }
}
export default TreeNodes;

import * as React from 'react';
import * as _ from 'lodash';

import { FatClassModel } from '../diagram/elements';
import { formatLocalizedLabel } from '../diagram/model';
import { Node } from './node';

export interface TreeNodesProps {
    roots: ReadonlyArray<FatClassModel> | undefined;
    expanded?: Boolean;
    result: Array<FatClassModel> | undefined;
    searchString?: string | undefined;
    lang?: Readonly<string> | undefined;
    onClassSelected: (classId: string) => void;
}

const CLASS_NAME = 'ontodia-class-tree';

export class TreeNodes extends React.Component<TreeNodesProps, {}> {
    public static defaultProps: Partial<TreeNodesProps> = {
        expanded: true
    };

    constructor(props: TreeNodesProps) {
        super(props);
        this.filter = this.filter.bind(this);
        this.compare = this.compare.bind(this);
    }

    filter(root: FatClassModel): Boolean {
        const { result } = this.props;
        if (result) {
            return Boolean(result.find(resultRoot => resultRoot === root));
        } else {
            return true;
        }
    }

    compare(node1: FatClassModel, node2: FatClassModel) {
        let classLabel1 = formatLocalizedLabel(node1.id, node1.label, this.props.lang);
        let classLabel2 = formatLocalizedLabel(node2.id, node2.label, this.props.lang);
        if (classLabel1 < classLabel2) {
            return -1;
        } else {
            return 1;
        }
    }

    getRenderRoots() {
        let roots;
        if (this.props.result && this.props.result.length === 0) { // a search was performed. The result is empty.
            roots = this.props.roots;
        } else { // need a filter for the displayed roots
            roots = this.props.roots && this.props.roots.filter(this.filter).sort(this.compare);
        }
        return roots;
    }

    render() {
        let { expanded, result, searchString, lang, onClassSelected } = this.props;
        const roots = this.getRenderRoots();

        return (
            <ul className={`${CLASS_NAME}__elements`} style={{ display: expanded ? 'block' : 'none' }}>
                {roots && roots.map(element => (
                    <div key={`node-${element.id}`}>
                        <Node node={element} result={result} searchString={searchString}
                            onClassSelected={onClassSelected} lang={this.props.lang} />
                    </div>
                ))}
            </ul>
        );
    }
}
export default TreeNodes;

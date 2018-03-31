import * as React from 'react';
import * as _ from 'lodash';

import { FatClassModel } from '../diagram/elements';
import { formatLocalizedLabel } from '../diagram/model';
import { DiagramView } from '../diagram/view';
import { Node } from './node';

export interface TreeNodesProps {
    roots?: ReadonlyArray<FatClassModel> | undefined;
    expanded?: Boolean;
    resultIds?: Array<string> | undefined;
    searchString?: string | undefined;
    lang?: Readonly<string> | undefined;
    onClassSelected: (classId: string) => void;
    view: DiagramView;
}

const CLASS_NAME = 'ontodia-class-tree';

export class TreeNodes extends React.Component<TreeNodesProps, {}> {
    public static defaultProps: Partial<TreeNodesProps> = {
        expanded: true,
        lang: 'en',
    };

    constructor(props: TreeNodesProps) {
        super(props);
        this.filter = this.filter.bind(this);
    }

    filter(root: FatClassModel): Boolean {
        const { resultIds } = this.props;
        if (resultIds) {
            return Boolean(resultIds.find(id => root.id === id));
        } else {
            return true;
        }
    }

    compare(node1: FatClassModel, node2: FatClassModel) {
        let classLabel1 = formatLocalizedLabel(node1.id, node1.label, Boolean(this) ? this.props.lang : 'en');
        let classLabel2 = formatLocalizedLabel(node2.id, node2.label, Boolean(this) ? this.props.lang : 'en');
        if (classLabel1 < classLabel2) {
            return -1;
        } else {
            return 1;
        }
    }
    getRenderRoots() {
        let roots;
        if (this.props.resultIds && this.props.resultIds.length === 0) {
            roots = this.props.roots;
        } else {
            roots = this.props.roots && this.props.roots.filter(this.filter).sort(this.compare);
        }
        return roots;
    }
    render() {
        let { expanded, resultIds, searchString, lang, onClassSelected } = this.props;
        const roots = this.getRenderRoots();

        return (
            <ul className={`${CLASS_NAME}__elements`} style={{ display: expanded ? 'block' : 'none' }}>
                {roots && roots.map(element => (
                    <div key={`node-${element.id}`}>
                        <Node node={element} resultIds={resultIds} lang={lang} view={this.props.view}
                        searchString={searchString} onClassSelected={onClassSelected} />
                    </div>
                ))}
            </ul>
        );
    }
}
export default TreeNodes;

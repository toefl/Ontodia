import * as React from 'react';
import * as _ from 'lodash';

import { Dictionary, LocalizedString } from '../data/model';
import { FatClassModel } from '../diagram/elements';
import { DiagramView } from '../diagram/view';
import { EventObserver } from '../viewUtils/events';
import { formatLocalizedLabel } from '../diagram/model';
import { TreeNodes } from './treeNodes';

export interface NodeTreeProps {
    node: FatClassModel;
    lang?: Readonly<string> | undefined;
    resultIds?: Array<string> | undefined;
    searchString?: string | undefined;
    onClassSelected: (classId: string) => void;
}

interface ClassTreeState {
    expanded?: Boolean | undefined;
    bgColor?: string | undefined;
}

const CLASS_NAME = 'ontodia-class-tree';

export class Node extends React.Component<NodeTreeProps, ClassTreeState> {
    constructor(props: NodeTreeProps) {
        super(props);

        this.state = { expanded: false };
        this.toggle = this.toggle.bind(this);
        this.showInstances = this.showInstances.bind(this);
    }

    componentWillReceiveProps(nextProps: NodeTreeProps) {
        const { resultIds } = nextProps;
        if (resultIds !== this.props.resultIds) {
            this.setState({ expanded: false });
        }
        if (resultIds && resultIds.length !== 0) {
            this.setState({ expanded: Boolean(resultIds.find(id => id === this.props.node.id)) });
        }
        if ( this.state.bgColor === 'rgb(190,235,255)' ) {
            this.setState({bgColor: undefined});
        }
    }

    toggle() {
        this.setState({ expanded: !this.state.expanded });
    }

    showInstances() {
        this.setState({bgColor: 'rgb(190,235,255)'});
        this.props.onClassSelected(this.props.node.id);
    }

    hasChildren(node: FatClassModel): string {
        if (node.derived.length !== 0) {
            return 'parent-tree-icon';
        } else {
            return 'default-tree-icon';
        }
    }
    getIcon(): string {
        if (this.props.node.derived.length === 0) {
            return undefined;
        } else {
            if (this.state.expanded) {
                return 'expand-node-icon';
            } else {
                return 'collapse-node-icon';
            }
        }
    }

    render(): React.ReactElement<any> {
        const { node, resultIds, searchString, lang, onClassSelected } = this.props;
        const bgColor = this.state.bgColor;
        let bold = false;
        if (Boolean(resultIds) && resultIds.length !== 0) {
            for (let i = 0; i < node.label.length; i++) {
                if (node.label[i].text.toUpperCase().indexOf(searchString.toUpperCase()) !== -1) {
                    bold = true;
                }
            }
            if (node.count.toString().indexOf(searchString.toUpperCase()) !== -1) {
                bold = true;
            }
        }
        return (
            <div>
                <div className='container' role='treeitem'>
                    <div className={this.getIcon()} onClick={this.toggle} />
                    <li className={this.hasChildren(node)} onClick={this.showInstances}
                        style={{ fontWeight: bold ? 'bold' : 'normal', background: bgColor }}>
                        {formatLocalizedLabel(node.id, node.label, lang) + ' (' + node.count + ')'}
                    </li>
                    <TreeNodes roots={node.derived} expanded={this.state.expanded} resultIds={resultIds}
                        searchString={searchString} lang={lang} onClassSelected={onClassSelected} />
                </div>
            </div>
        );
    }
}

export default Node;

import * as React from 'react';
import * as _ from 'lodash';

import { FatClassModel } from '../diagram/elements';
import { formatLocalizedLabel } from '../diagram/model';
import { TreeNodes } from './treeNodes';

export interface NodeTreeProps {
    node: FatClassModel;
    lang?: Readonly<string> | undefined;
    searchResult?: Array<FatClassModel> | undefined;
    searchString?: string | undefined;
    onClassSelected: (classId: string) => void;
    onDragDrop?: (e: DragEvent, paperPosition: { x: number; y: number; }) => void;
}

export interface ClassTreeState {
    expanded?: Boolean | undefined;
    bgColor?: string | undefined;
}

const CLASS_NAME = 'ontodia-class-tree';

export class Node extends React.Component<NodeTreeProps, ClassTreeState> {
    constructor(props: NodeTreeProps) {
        super(props);
        let resultEmpty = !(this.props.searchResult && this.props.searchResult.length !== 0);
        if (resultEmpty) {
            this.state = { expanded: false };
        } else {
            this.state = { expanded: true };
        }
        this.toggle = this.toggle.bind(this);
        this.showInstances = this.showInstances.bind(this);
    }

    componentWillReceiveProps(nextProps: NodeTreeProps) {
        const { searchResult } = nextProps;
        if (searchResult !== this.props.searchResult) {
            this.setState({ expanded: false });
        }
        if (searchResult && searchResult.length !== 0) {
            this.setState({ expanded: true });
        }
        if (this.state.bgColor === 'rgb(190,235,255)') {
            this.setState({ bgColor: undefined });
        }
    }

    toggle() {
        this.setState({ expanded: !this.state.expanded });
    }

    showInstances() {
        this.setState({ bgColor: 'rgb(190,235,255)' });
        this.props.onClassSelected(this.props.node.id);
    }

    hasChildren(): string {
        if (this.props.node.derived.length !== 0) {
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

    boldNode(classLabel: string): Boolean {
        if (Boolean(this.props.searchResult) && this.props.searchResult.length !== 0) {
            if (classLabel.toUpperCase().indexOf(this.props.searchString.toUpperCase()) !== -1) {
                return true;
            }
            try { // FatClassModel from dbpedia does not contain information about count
                if (this.props.node.count.toString().indexOf(this.props.searchString.toUpperCase()) !== -1) {
                    return true;
                }
            } catch (err) {
                // console.error("class.count === undefined. The search for count will be ignored.")
            }
        }
        return false;
    }
    render(): React.ReactElement<any> {
        const { node, searchResult, searchString, lang, onClassSelected } = this.props;
        const bgColor = this.state.bgColor;
        let classLabel = formatLocalizedLabel(node.id, node.label, lang);
        let bold = this.boldNode(classLabel);

        return (
            <div className='container' role='treeitem'>
                <div className={this.getIcon()} onClick={this.toggle} />
                <li className={this.hasChildren()} onClick={this.showInstances}
                    style={{ fontWeight: bold ? 'bold' : 'normal', background: bgColor }}
                    draggable={true}
                    onDragStart={e => {
                        const elementId = [node.id];
                        try {
                            e.dataTransfer.setData('application/x-ontodia-elements', JSON.stringify(elementId));
                        } catch (ex) { // IE fix
                            e.dataTransfer.setData('text', JSON.stringify(elementId));
                        }
                        return false;
                    }}>
                    {classLabel + (node.count !== undefined ? (' (' + node.count + ')') : '')}
                </li>
                {node.derived && node.derived.length !== 0 ? (
                    <TreeNodes roots={node.derived} expanded={this.state.expanded} searchResult={searchResult}
                        searchString={searchString} lang={lang} onClassSelected={onClassSelected} />
                ) : (null)}
            </div>
        );
    }
}

export default Node;

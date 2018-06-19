import * as React from 'react';
import * as _ from 'lodash';

import { FatClassModel } from '../diagram/elements';
import { formatLocalizedLabel } from '../diagram/model';
import { TreeNodes } from './treeNodes';

export interface Props {
    node: FatClassModel;
    lang?: string;
    classesToDisplay?: Array<FatClassModel>;
    searchString?: string;
    onClassSelected: (classId: string) => void;
    onDragDrop?: (e: DragEvent, paperPosition: { x: number; y: number }) => void;
}

export interface State {
    expanded?: boolean;
    bgColor?: string;
    mapClassIcons?: { [typeId: string]: string };
}

const CLASS_NAME = 'ontodia-class-tree';

export class Node extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        const resultEmpty = !(this.props.classesToDisplay && this.props.classesToDisplay.length !== 0);
        if (resultEmpty) {
            this.state = { expanded: false };
        } else {
            this.state = { expanded: true };
        }
        this.toggle = this.toggle.bind(this);
        this.showInstances = this.showInstances.bind(this);
    }

    componentWillReceiveProps(nextProps: Props) {
        const { classesToDisplay } = nextProps;
        if (classesToDisplay !== this.props.classesToDisplay) {
            this.setState({ expanded: false });
        }
        if (classesToDisplay && classesToDisplay.length !== 0) {
            this.setState({ expanded: true });
        }
        if (this.state.bgColor !== undefined) {
            this.setState({ bgColor: undefined });
        }
    }

    private toggle() {
        this.setState({ expanded: !this.state.expanded });
    }

    private showInstances(e: React.MouseEvent<HTMLAnchorElement>) {
        this.setState({ bgColor: 'rgb(190,235,255)' });
        this.props.onClassSelected(this.props.node.id);
        e.preventDefault();
    }

    private getDefaultNodeIcon(): string {
        if (this.props.node.derived.length !== 0) {
            return 'parent-tree-icon';
        } else {
            return 'default-tree-icon';
        }
    }
    private getToggleIcon(): string {
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

    private boldNode(classLabel: string): boolean {
        if (Boolean(this.props.classesToDisplay) && this.props.classesToDisplay.length !== 0) {
            if (classLabel.toUpperCase().indexOf(this.props.searchString.toUpperCase()) !== -1) {
                return true;
            }
            if (Boolean(this.props.node.count)) {
                if (this.props.node.count.toString().indexOf(this.props.searchString.toUpperCase()) !== -1) {
                    return true;
                }
            }
        }
        return false;
    }
    render(): React.ReactElement<any> {
        const { node, classesToDisplay, searchString, lang, onClassSelected } = this.props;
        const bgColor = this.state.bgColor;
        const classLabel = formatLocalizedLabel(node.id, node.label, lang);
        const bold = this.boldNode(classLabel);

        return (
            <div className='container' role='tree-item'>
                <div className={this.getToggleIcon()} onClick={this.toggle} />

                <div className={this.state.mapClassIcons && this.state.mapClassIcons[node.id] ?
                    this.state.mapClassIcons[node.id] : this.getDefaultNodeIcon()} />

                <a href={node.id} className='tree-class' onClick={(e) => this.showInstances(e)}
                    style={{ fontWeight: bold ? 'bold' : 'normal', background: bgColor }}>
                    {classLabel} {Boolean(node.count) ? (<span className='ontodia-badge'>{node.count}</span>) : null}
                </a>

                {node.derived && node.derived.length !== 0 ? (
                    <TreeNodes roots={node.derived} expanded={this.state.expanded} classesToDisplay={classesToDisplay}
                        searchString={searchString} lang={lang} onClassSelected={onClassSelected} />
                ) : (null)}
            </div>
        );
    }
}

export default Node;

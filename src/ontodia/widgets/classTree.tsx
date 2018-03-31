import * as React from 'react';
import * as _ from 'lodash';

import { FatClassModel } from '../diagram/elements';
import { DiagramView } from '../diagram/view';
import { EventObserver } from '../viewUtils/events';
import { formatLocalizedLabel } from '../diagram/model';
import { TreeNodes } from './treeNodes';

export interface ClassTreeProps {
    view: DiagramView;
    onClassSelected: (classId: string) => void;
}

interface ClassTreeState {
    roots?: ReadonlyArray<FatClassModel> | undefined;
    resultIds?: Array<string> | undefined;
    lang?: Readonly<string> | undefined;
    searchString?: string | undefined;
}

const CLASS_NAME = 'ontodia-class-tree';

export class ClassTree extends React.Component<ClassTreeProps, ClassTreeState> {
    private readonly listener = new EventObserver();

    constructor(props: ClassTreeProps) {
        super(props);
        this.state = ({ roots: undefined });
    }

    componentDidMount() {
        const { view } = this.props;
        this.listener.listen(view.events, 'changeLanguage', () => {
            this.refreshClassTree();
        });

        this.listener.listen(view.model.events, 'loadingSuccess', () => {
            this.refreshClassTree();
        });
    }

    componentWillUnmount() {
        this.listener.stopListening();
    }

    render() {
        return (
            <div className={CLASS_NAME}>
                <div className={`${CLASS_NAME}__filter`}>
                    <div className={`${CLASS_NAME}__filter-group`}>
                        <input type='text'
                            className='search-input ontodia-form-control'
                            placeholder='Search for...'
                            defaultValue=''
                            onKeyUp={this.onSearchKeyup}
                        />
                    </div>
                </div>
                <div className={`${CLASS_NAME}__rest`}>
                    <div className={`${CLASS_NAME}__tree`}>
                        <TreeNodes roots={this.state.roots} searchString={this.state.searchString}
                            resultIds={this.state.resultIds} lang={this.state.lang}
                            onClassSelected={this.props.onClassSelected} view={this.props.view}/>
                    </div>
                </div>
            </div>
        );
    }
    private onSearchKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const searchString = e.currentTarget.value;
        this.search(searchString);
    }
    private search = (searchString: string): void => {
        if (searchString.trim().length === 0) {
            if (this.state.resultIds) {
                this.setState({ resultIds: undefined });
            }
            return;
        }
        let result: Array<FatClassModel> = [];
        for (let i = 0; i < this.state.roots.length; i++) {
            this.deepSearch(searchString, this.state.roots[i], result);
        }
        this.setState({ resultIds: this.printNodesIds(result), searchString: searchString });
    }
    private deepSearch = (searchString: string, node: FatClassModel, result: Array<FatClassModel>): void => {
        let classLabel = formatLocalizedLabel(node.id, node.label, this.state.lang);
        if (classLabel.toUpperCase().indexOf(searchString.toUpperCase()) !== -1) {
            result.push(node);
        }
        if (node.count.toString().indexOf(searchString.toUpperCase()) !== -1) {
            result.push(node);
        }
        for (let i = 0; i < node.derived.length; i++) {
            this.deepSearch(searchString, node.derived[i], result);
        }
    }
    private printNodesIds(result: FatClassModel[]): Array<string> {
        let printNodesIds: Array<string> = result.map(e => e.id);
        for (let i = 0; i < result.length; i++) {
            let tmp = result[i];
            while (tmp.base !== undefined) {
                printNodesIds.push(tmp.base.id);
                tmp = tmp.base;
            }
        }
        printNodesIds = this.getUnique(printNodesIds);
        return printNodesIds;
    }
    private getUnique(nodesId: Array<string>) {
        let unique = [];
        for (let i = 0; i < nodesId.length; i++) {
            if (unique.indexOf(nodesId[i]) === -1) {
                unique.push(nodesId[i]);
            }
        }
        return unique;
    };
    private refreshClassTree(): void {
        const { view } = this.props;
        const roots = view.model.getClasses().filter(model => !model.base);
        roots.sort((node1, node2) => {
            let classLabel1 = formatLocalizedLabel(node1.id, node1.label, this.state.lang);
            let classLabel2 = formatLocalizedLabel(node2.id, node2.label, this.state.lang);
            if (classLabel1 < classLabel2) {
                return -1;
            } else {
                return 1;
            }
        });
        this.setState({ roots: roots, lang: view.getLanguage() });
    }
}
export default ClassTree;

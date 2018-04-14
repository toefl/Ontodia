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

export interface ClassTreeState {
    roots?: ReadonlyArray<FatClassModel> | undefined;
    resultIds?: Array<FatClassModel> | undefined;
    lang?: Readonly<string> | undefined;
    searchString?: string | undefined;
}

const CLASS_NAME = 'ontodia-class-tree';

export class ClassTree extends React.PureComponent<ClassTreeProps, ClassTreeState> {
    private readonly listener = new EventObserver();

    constructor(props: ClassTreeProps) {
        super(props);
        this.state = ({ roots: undefined });
        this.search = _.debounce(this.search, 800 /* ms */);
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
                            searchResult={this.state.resultIds} lang={this.props.view.getLanguage()}
                            onClassSelected={this.props.onClassSelected} />
                    </div>
                </div>
            </div>
        );
    }
    private onSearchKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        this.search(e.currentTarget.value);
    }
    private search = (searchString: string): void => {
        if (searchString.trim().length === 0) {
            if (this.state.resultIds) {
                this.setState({ resultIds: undefined, searchString: undefined });
            }
            return;
        }
        if (searchString === this.state.searchString) {
            return;
        }
        let searchResult: Array<FatClassModel> = [];
        this.state.roots.forEach(node => {
            this.deepSearch(searchString, node, searchResult);
        });
        this.setState({ resultIds: this.printNodes(searchResult), searchString: searchString });
    }
    private deepSearch = (searchString: string, node: FatClassModel, searchResult: Array<FatClassModel>): void => {
        let classLabel = formatLocalizedLabel(node.id, node.label, this.state.lang);
        if (classLabel.toUpperCase().indexOf(searchString.toUpperCase()) !== -1) {
            searchResult.push(node);
        }
        try { // FatClassModel from dbpedia does not contain information about count
            if (node.count.toString().indexOf(searchString.toUpperCase()) !== -1) {
                searchResult.push(node);
            }
        } catch (e) {
            // console.error("class.count === undefined. The search for count will be ignored.")
        }
        for (let i = 0; i < node.derived.length; i++) {
            this.deepSearch(searchString, node.derived[i], searchResult);
        }
    }
    private printNodes(searchResult: FatClassModel[]): Array<FatClassModel> {
        let printNodes: Array<FatClassModel> = searchResult;
        for (let i = 0; i < searchResult.length; i++) {
            let tmp = searchResult[i];
            while (tmp.base !== undefined) {
                printNodes.push(tmp.base);
                tmp = tmp.base;
            }
        }
        printNodes = this.getUnique(printNodes);
        return printNodes;
    }
    private getUnique(nodes: Array<FatClassModel>) {
        let unique = [];
        for (let i = 0; i < nodes.length; i++) {
            if (unique.indexOf(nodes[i]) === -1) {
                unique.push(nodes[i]);
            }
        }
        return unique;
    };
    sort(node1: FatClassModel, node2: FatClassModel) {
        let classLabel1 = formatLocalizedLabel(node1.id, node1.label, this.state.lang);
        let classLabel2 = formatLocalizedLabel(node2.id, node2.label, this.state.lang);
        if (classLabel1 < classLabel2) {
            return -1;
        } else {
            return 1;
        }
    }
    private findBaseClasses(root: FatClassModel, baseClasses: Array<FatClassModel>, notBaseClasses: Array<FatClassModel>) {
        while (root.base !== undefined) {
            if (notBaseClasses.indexOf(root) === -1) {
                notBaseClasses.push(root);
            }
            root = root.base;
        }
        if (baseClasses.indexOf(root) === -1) {
            baseClasses.push(root);
        }
    }
    private deleteFakeBaseClasses(baseClasses: Array<FatClassModel>, notBaseClasses: Array<FatClassModel>): void {
        for (let i = 0; i < baseClasses.length; i++) {
            for (let j = 0; j < notBaseClasses.length; j++) {
                if ((baseClasses[i].id === notBaseClasses[j].id) && baseClasses[i].derived.length === 0) {
                    baseClasses.splice(i, 1);
                    i = i - 1;
                }
            }
        }
    }
    private refreshClassTree(): void {
        const { view } = this.props;
        let classes = view.model.getClasses();
        let baseClasses: Array<FatClassModel> = [];
        let notBaseClasses: Array<FatClassModel> = [];
        console.log('Classes count: ' + classes.length);
        classes.forEach(elem => {
            this.findBaseClasses(elem, baseClasses, notBaseClasses);
        });
        this.deleteFakeBaseClasses(baseClasses, notBaseClasses);
        baseClasses.sort();
        this.setState({ roots: baseClasses, lang: view.getLanguage() });
    }
}
export default ClassTree;

import * as React from 'react';
import * as _ from 'lodash';

import { FatClassModel } from '../diagram/elements';
import { DiagramView } from '../diagram/view';
import { EventObserver } from '../viewUtils/events';
import { formatLocalizedLabel } from '../diagram/model';
import { TreeNodes } from './treeNodes';
import { Debouncer } from '../viewUtils/async';
import { ElementTypeIri } from '../data/model';
import { EditorController } from '../editor/editorController';

export interface Props {
    view: DiagramView;
    editor: EditorController;
    onClassSelected: (classId: ElementTypeIri) => void;
}

export interface State {
    roots?: ReadonlyArray<FatClassModel>;
    classesToDisplay?: Array<FatClassModel>;
    lang?: Readonly<string>;
    searchString?: string;
}

const CLASS_NAME = 'ontodia-class-tree';

export class ClassTree extends React.Component<Props, State> {
    private readonly listener = new EventObserver();
    private readonly searchDebouncer = new Debouncer(400 /* ms */);

    constructor(props: Props) {
        super(props);
        this.state = ({});
    }

    componentDidMount() {
        const {view, editor} = this.props;
        this.listener.listen(view.events, 'changeLanguage', () => this.refreshClassTree());
        this.listener.listen(editor.model.events, 'changeClassTree', () => {
            this.refreshClassTree();
        });
    }

    componentWillUnmount() {
        this.listener.stopListening();
        this.searchDebouncer.dispose();
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
                            classesToDisplay={this.state.classesToDisplay} lang={this.props.view.getLanguage()}
                            onClassSelected={this.props.onClassSelected} />
                    </div>
                </div>
            </div>
        );
    }
    private onSearchKeyup = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const keyValue = e.currentTarget.value;
        this.searchDebouncer.call(() => this.search(keyValue));
    }
    private search = (searchString: string) => {
        if (searchString.trim().length === 0) {
            if (this.state.classesToDisplay) {
                this.setState({ classesToDisplay: undefined, searchString: undefined });
            }
            return;
        }
        if (searchString === this.state.searchString) {
            return;
        }
        const searchResult: Array<FatClassModel> = [];
        this.state.roots.forEach(node => {
            this.deepSearch(searchString, node, searchResult);
        });
        this.setState({ classesToDisplay: this.getClassesToDisplay(searchResult), searchString: searchString });
    }
    private deepSearch = (searchString: string, node: FatClassModel, searchResult: Array<FatClassModel>): void => {
        const classLabel = formatLocalizedLabel(node.id, node.label, this.state.lang);
        if (classLabel.toUpperCase().indexOf(searchString.toUpperCase()) !== -1) {
            searchResult.push(node);
        }
        if (Boolean(node.count)) {
            if (node.count.toString().indexOf(searchString.toUpperCase()) !== -1) {
                searchResult.push(node);
            }
        }
        for (const derived of node.derived) {
            this.deepSearch(searchString, derived, searchResult);
        }
    }
    private getClassesToDisplay(searchResult: FatClassModel[]): Array<FatClassModel> {
        let classesToDisplay: Array<FatClassModel> = searchResult;
        for (let i = 0; i < searchResult.length; i++) {
            let tmp = searchResult[i];
            while (tmp.base !== undefined) {
                classesToDisplay.push(tmp.base);
                tmp = tmp.base;
            }
        }
        classesToDisplay = this.getUnique(classesToDisplay);
        return classesToDisplay;
    }
    private getUnique(nodes: Array<FatClassModel>) {
        const uniqueClasses = [];
        for (const node of nodes) {
            if (uniqueClasses.indexOf(node) === -1) {
                uniqueClasses.push(node);
            }
        }
        return uniqueClasses;
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
        const classes = view.model.getClasses;
        const baseClasses: Array<FatClassModel> = [];
        const notBaseClasses: Array<FatClassModel> = [];
        classes.forEach(elem => {
            this.findBaseClasses(elem, baseClasses, notBaseClasses);
        });
        this.deleteFakeBaseClasses(baseClasses, notBaseClasses);
        this.setState({ roots: baseClasses, lang: view.getLanguage() });
    }
}
export default ClassTree;

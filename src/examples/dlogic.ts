import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';

import { Workspace, WorkspaceProps } from '../index';

import { onPageLoad, tryLoadLayoutFromLocalStorage, saveLayoutToLocalStorage } from './common';
import { DemoDataProvider } from '../index';
import { ClassModel, ClassIri } from '../ontodia/data/model';

const data = require<string>('./resources/logicalExpression.txt');
const LINK_TYPES = require<any>('./resources/linkTypes.json');
const ELEMENTS = require<any>('./resources/elements.json');
const LINKS = require<any>('./resources/links.json');

function DeleteEmptyCells(concepts: Array<string>): Array<string> {
    for (let i = 0; i < concepts.length; i++) {
        if (concepts[i].length === 0) {
            concepts.splice(i, 1);
            i--;
        }
    }
    return concepts;
}

function CreateTruthTable(formula: string, concepts: Array<string>): Array<string> {
    const truthTable = new Array(concepts.length);
    const formulaLetters = formula.split('');
    const operations: Array<string> = [];
    formulaLetters.forEach(letter => {
        if (letter === '⊑' || letter === '∃' || letter === '⊓' || letter === '≡' || letter === '¬') {
            operations.push(letter);
        }
    });
    if (operations.length === 0) { return undefined; }
    for (let i = 0; i < truthTable.length; i++) {
        truthTable[i] = new Array(concepts.length + operations.length);
    }
    return truthTable;
}

function LEParser(formula: string): DemoDataProvider {
    let concepts = formula.split(/[ ⊑ | ∃ | ⊓ | ≡ | ¬ | \( | \)]/g);
    concepts = DeleteEmptyCells(concepts);
    const treeConcepts: ClassModel[] = [];
    concepts.forEach(concept => {
        const tmp: ClassModel = {
            id: concept as ClassIri,
            label: { values: [{ lang: 'eng', text: concept }] },
            count: 0,
            children: [],
        };
        treeConcepts.push(tmp);
    });
    const truthTable: Array<string> = CreateTruthTable(formula, concepts);
    if (truthTable === undefined) { alert('The original formula does not contain logical operations'); }
    console.log(truthTable);
    const dataProvider = new DemoDataProvider(treeConcepts, LINK_TYPES, ELEMENTS, LINKS);
    return dataProvider;
}

function onWorkspaceMounted(workspace: Workspace) {
    if (!workspace) { return; }

    const layoutData = tryLoadLayoutFromLocalStorage();
    workspace.getModel().importLayout({
        layoutData,
        dataProvider: LEParser(data),
        validateLinks: true,
    });
}

const props: WorkspaceProps & ClassAttributes<Workspace> = {
    ref: onWorkspaceMounted,
    onSaveDiagram: workspace => {
        const { layoutData } = workspace.getModel().exportLayout();
        window.location.hash = saveLayoutToLocalStorage(layoutData);
        window.location.reload();
    },
    viewOptions: {
        onIriClick: iri => console.log(iri),
    },
};

onPageLoad(container => ReactDOM.render(createElement(Workspace, props), container));
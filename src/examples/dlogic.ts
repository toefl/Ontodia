import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';

import { Workspace, WorkspaceProps } from '../index';

import { onPageLoad, tryLoadLayoutFromLocalStorage, saveLayoutToLocalStorage } from './common';
import { DemoDataProvider } from '../index';
import {
    Dictionary, ClassModel, LinkType, ElementModel, LinkModel, LinkCount,
    ElementIri, ClassIri, LocalizedString
} from '../ontodia/data/model';
import { FatClassModel } from '../ontodia/diagram/elements';
import { lab } from 'd3-color';

const data = require<string>('./resources/logicalExpression.txt');
const LINK_TYPES = require<any>('./resources/linkTypes.json');
const ELEMENTS = require<any>('./resources/elements.json');
const LINKS  = require<any>('./resources/links.json');

function LEParser(data: string): DemoDataProvider {
    const symbols = ['⊑', '∃', '⊓', '≡', '¬'];
    const concepts = data.split(' ');
    for (let i = 0; i < concepts.length; i++) {
        if (!symbols.indexOf(concepts[i])) {
            concepts.splice(i, 1);
            i--;
        }
    }
    const treeConcepts: ClassModel[] = [];
    concepts.forEach(concept => {
        let count = 0;
        const children: ClassModel[] = [];
        const id = concept as ClassIri;
        const label: { values: LocalizedString[] } = { values: [{ lang: 'eng', text: concept }] };
        const tmp: ClassModel = { id, label, count, children };
        console.log(tmp);
        treeConcepts.push(tmp);
    });
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
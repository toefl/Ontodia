import { createElement, ClassAttributes } from 'react';
import * as ReactDOM from 'react-dom';

import { Workspace, WorkspaceProps, DemoDataProvider, LinkModel } from '../index';
import { onPageLoad, tryLoadLayoutFromLocalStorage, saveLayoutToLocalStorage } from './common';
import { ClassModel, ClassIri, ElementIri, LinkTypeIri, LinkType } from '../ontodia/data/model';
import { LinkTemplate } from '../ontodia/customization/props';

const data = require<string>('./resources/logicalExpression.txt');
// ELEMENTS оставил из demo.ts   Пока не решил что подсунуть вместо этого, а undefined не принимает
const ELEMENTS = require<any>('./resources/elements.json');

function DeleteEmptyCells(concepts: Array<string>): Array<string> {
    for (let i = 0; i < concepts.length; i++) {
        if (concepts[i].length === 0) {
            concepts.splice(i, 1);
            i--;
        }
    }
    return concepts;
}

// Пока не уверен в необходимости. Оставил написание функции
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

function setConcepts(formulaConcepts: string[], CONCEPTS: ClassModel[]) {
    formulaConcepts.forEach(concept => {
        const tmp: ClassModel = {
            id: concept as ClassIri,
            label: { values: [{ lang: 'eng', text: concept }] },
            count: 0,
            children: [],
        };
        CONCEPTS.push(tmp);
    });
}

function setLinks(formula: string, LINKS: LinkModel[], concepts: string[]) {
    const formulaLetters = formula.replace(/\s+/g, '').split('');
    let j = 0;
    for (let i = 0; i < formulaLetters.length - 1; i++) {
        if (formulaLetters[i] === '⊑' || formulaLetters[i] === '∃' || formulaLetters[i] === '⊓'
            || formulaLetters[i] === '≡' || formulaLetters[i] === '¬') {
            LINKS.push({
                linkTypeId: formulaLetters[i] as LinkTypeIri,
                sourceId: concepts[j] as ElementIri,
                targetId: concepts[j + 1] as ElementIri,
            });
            j++;
        }
    }
}

function setLinksTypes(LINK_TYPES: LinkType[], LINKS: LinkModel[]) {
    LINKS.forEach(link => {
        const tmp: LinkType = {
            id: link.linkTypeId as LinkTypeIri,
            label: { values: [{ lang: 'en', text: link.linkTypeId }] },
            count: 0,
        };
        LINK_TYPES.push(tmp);
    });
}

function LEParser(formula: string): DemoDataProvider {
    let concepts = formula.split(/[ ⊑ | ∃ | ⊓ | ≡ | ¬ | \( | \)]/g);
    concepts = DeleteEmptyCells(concepts);
    const CONCEPTS: ClassModel[] = [];
    const LINKS: LinkModel[] = [];
    const LINK_TYPES: LinkType[] = [];
    setConcepts(concepts, CONCEPTS);
    setLinks(formula, LINKS, concepts);
    setLinksTypes(LINK_TYPES, LINKS);
    // ниже добавил отладочный вывод подготовленных данных
    console.log(CONCEPTS);
    console.log(LINK_TYPES);
    console.log(LINKS);
    const dataProvider = new DemoDataProvider(CONCEPTS, LINK_TYPES, ELEMENTS, LINKS);
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
        onIriClick: iri => window.open(iri),
        templatesResolvers: [
            types => {
                // здесь всегда пусто. И не рисуются связи между концептами
                console.log(types);
                if (types.indexOf('⊑') !== -1 || types.indexOf('⊓') !== -1) {
                    // return SOME_TEMPLATE;
                }
                return undefined;
            }
        ],
    },
};

onPageLoad(container => ReactDOM.render(createElement(Workspace, props), container));
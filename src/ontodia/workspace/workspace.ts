import { Component, createElement, ReactElement, cloneElement } from 'react';
import * as ReactDOM from 'react-dom';
import { first, last } from 'lodash';

import { makeCellMove, setLinkVertices } from '../diagram/commands';
import { Element, Link, FatLinkType } from '../diagram/elements';
import { boundsOf } from '../diagram/geometry';
import { Batch, Command, CommandHistory } from '../diagram/history';
import { DiagramModel } from '../diagram/model';
import { PaperArea, ZoomOptions, PointerEvent, PointerUpEvent, getContentFittingBox } from '../diagram/paperArea';
import { DiagramView, DiagramViewOptions } from '../diagram/view';

import { EventObserver } from '../viewUtils/events';
import {
    forceLayout, removeOverlaps, padded, translateToPositiveQuadrant,
    LayoutNode, LayoutLink, translateToCenter,
} from '../viewUtils/layout';
import { dataURLToBlob } from '../viewUtils/toSvg';

import { ClassTree } from '../widgets/classTree';
import { SearchCriteria } from '../widgets/instancesSearch';

import { DefaultToolbar, ToolbarProps as DefaultToolbarProps } from './toolbar';
import { showTutorial, showTutorialIfNotSeen } from './tutorial';
import { WorkspaceMarkup, Props as MarkupProps } from './workspaceMarkup';

const saveAs = require<(file: Blob, fileName: string) => void>('file-saverjs');
export interface WorkspaceProps {
    onSaveDiagram?: (workspace: Workspace) => void;
    onShareDiagram?: (workspace: Workspace) => void;
    onEditAtMainSite?: (workspace: Workspace) => void;
    onPointerDown?: (e: PointerEvent) => void;
    onPointerMove?: (e: PointerEvent) => void;
    onPointerUp?: (e: PointerUpEvent) => void;
    hidePanels?: boolean;
    hideToolbar?: boolean;
    hideHalo?: boolean;
    isDiagramSaved?: boolean;
    hideTutorial?: boolean;
    viewOptions?: DiagramViewOptions;
    leftPanelInitiallyOpen?: boolean;
    rightPanelInitiallyOpen?: boolean;

    /**
     * Set of languages to display diagram data.
     */
    languages?: ReadonlyArray<WorkspaceLanguage>;
    /**
     * Currently selected language.
     */
    language?: string;
    /**
     * Called when user selected another language from the UI.
     *
     * If this function is set, language selection will work in controlled mode;
     * otherwise language selection will function in uncontrolled mode.
     */
    onLanguageChange?: (language: string) => void;
    zoomOptions?: ZoomOptions;
    onZoom?: (scaleX: number, scaleY: number) => void;
    toolbar?: ReactElement<any>;
}

export interface WorkspaceLanguage {
    code: string;
    label: string;
}

export interface State {
    readonly criteria?: SearchCriteria;
    readonly isLeftPanelOpen?: boolean;
    readonly isRightPanelOpen?: boolean;
}

export class Workspace extends Component<WorkspaceProps, State> {
    static readonly defaultProps: Partial<WorkspaceProps> = {
        hideTutorial: true,
        leftPanelInitiallyOpen: true,
        rightPanelInitiallyOpen: false,
        languages: [
            {code: 'en', label: 'English'},
            {code: 'ru', label: 'Russian'},
        ],
        language: 'en',
    };

    private readonly listener = new EventObserver();

    private readonly model: DiagramModel;
    private readonly diagram: DiagramView;

    private markup: WorkspaceMarkup;
    private tree: ClassTree;

    constructor(props: WorkspaceProps) {
        super(props);
        this.model = new DiagramModel();
        const viewOptions = {...this.props.viewOptions, disableDefaultHalo: this.props.hideHalo};
        this.diagram = new DiagramView(this.model, viewOptions);
        this.diagram.setLanguage(this.props.language);
        this.state = {
            isLeftPanelOpen: this.props.leftPanelInitiallyOpen,
            isRightPanelOpen: this.props.rightPanelInitiallyOpen,
        };
    }

    componentWillReceiveProps(nextProps: WorkspaceProps) {
        if (nextProps.language !== this.diagram.getLanguage()) {
            this.diagram.setLanguage(nextProps.language);
        }
    }

    _getPaperArea(): PaperArea | undefined {
        return this.markup ? this.markup.paperArea : undefined;
    }

    render(): ReactElement<any> {
        const {languages, toolbar, hidePanels, hideToolbar, onSaveDiagram} = this.props;
        return createElement(WorkspaceMarkup, {
            ref: markup => { this.markup = markup; },
            hidePanels,
            hideToolbar,
            view: this.diagram,
            leftPanelInitiallyOpen: this.props.leftPanelInitiallyOpen,
            rightPanelInitiallyOpen: this.props.rightPanelInitiallyOpen,
            searchCriteria: this.state.criteria,
            onSearchCriteriaChanged: criteria => this.setState({criteria}),
            zoomOptions: this.props.zoomOptions,
            onZoom: this.props.onZoom,
            isLeftPanelOpen: this.state.isLeftPanelOpen,
            onToggleLeftPanel: isLeftPanelOpen => this.setState({isLeftPanelOpen}),
            isRightPanelOpen: this.state.isRightPanelOpen,
            onToggleRightPanel: isRightPanelOpen => this.setState({isRightPanelOpen}),
            toolbar: createElement(ToolbarWrapper, {
                ...this.props,
                workspace: this,
                history: this.model.history,
                view: this.diagram,
            }),
        } as MarkupProps & React.ClassAttributes<WorkspaceMarkup>);
    }

    componentDidMount() {
        this.diagram._initializePaperComponents(this.markup.paperArea);

        this.listener.listen(this.model.events, 'elementEvent', ({key, data}) => {
            if (!data.requestedAddToFilter) { return; }
            const {source, linkType, direction} = data.requestedAddToFilter;
            this.setState({
                criteria: {
                    refElement: source,
                    refElementLink: linkType,
                    linkDirection: direction,
                },
            });
        });

        this.listener.listen(this.markup.paperArea.events, 'pointerUp', e => {
            if (this.props.onPointerUp) {
                this.props.onPointerUp(e);
            }
        });
        this.listener.listen(this.markup.paperArea.events, 'pointerMove', e => {
            if (this.props.onPointerMove) {
                this.props.onPointerMove(e);
            }
        });
        this.listener.listen(this.markup.paperArea.events, 'pointerDown', e => {
            if (this.props.onPointerDown) {
                this.props.onPointerDown(e);
            }
        });

        if (!this.props.hideTutorial) {
            showTutorialIfNotSeen();
        }
    }

    componentWillUnmount() {
        this.listener.stopListening();
        this.diagram.dispose();
    }

    getModel() { return this.model; }
    getDiagram() { return this.diagram; }

    preventTextSelectionUntilMouseUp() { this.markup.preventTextSelection(); }

    zoomToFit = () => {
        this.markup.paperArea.zoomToFit();
    }

    showWaitIndicatorWhile(promise: Promise<any>) {
        this.markup.paperArea.showIndicator(promise);
    }

    private forceLayoutElements = (batch: Batch, elements: Element[], group?: Element) => {
        for (const element of elements) {
            const nestedNodes = this.model.elements.filter(el => el.group === element.id);
            if (nestedNodes.length > 0) {
                this.forceLayoutElements(batch, nestedNodes, element);
            }
        }

        const nodes: LayoutNode[] = [];
        const nodeById: { [id: string]: LayoutNode } = {};
        for (const element of elements) {
            const {x, y, width, height} = boundsOf(element);
            const node: LayoutNode = {id: element.id, x, y, width, height};
            nodeById[element.id] = node;
            nodes.push(node);
        }

        const links: LayoutLink[] = [];
        for (const link of this.model.links) {
            if (!this.model.isSourceAndTargetVisible(link)) {
                continue;
            }
            const source = this.model.sourceOf(link);
            const target = this.model.targetOf(link);

            const sourceNode = nodeById[source.id];
            const targetNode = nodeById[target.id];

            if (sourceNode && targetNode) {
                links.push({source: sourceNode, target: targetNode});
            }
        }

        forceLayout({nodes, links, preferredLinkLength: 200});
        padded(nodes, {x: 10, y: 10}, () => removeOverlaps(nodes));

        const padding: { x: number; y: number; } = (
            group ? getContentFittingBox(elements, []) : {x: 150, y: 150}
        );

        translateToPositiveQuadrant({nodes, padding});

        for (const node of nodes) {
            const element = this.model.getElement(node.id);
            batch.execute(makeCellMove(element, {x: node.x, y: node.y}));
        }
    }

    forceLayout = () => {
        const syncAndZoom = Command.effect('Sync and zoom to fit', () => {
            this.diagram.performSyncUpdate();
            this.zoomToFit();
        });

        const batch = this.model.history.startBatch('Force layout');
        batch.registerToUndo(syncAndZoom);

        const elements = this.model.elements.filter(element => element.group === undefined);
        this.forceLayoutElements(batch, elements);
        for (const link of this.model.links) {
            batch.execute(setLinkVertices(link, []));
        }

        batch.execute(syncAndZoom);
        batch.store();
    }

    exportSvg = (fileName?: string) => {
        this.markup.paperArea.exportSVG().then(svg => {
            fileName = fileName || 'diagram.svg';
            const xmlEncodingHeader = '<?xml version="1.0" encoding="UTF-8"?>';
            const blob = new Blob([xmlEncodingHeader + svg], {type: 'image/svg+xml'});
            saveAs(blob, fileName);
        });
    }

    exportPng = (fileName?: string) => {
        fileName = fileName || 'diagram.png';
        this.markup.paperArea.exportPNG({backgroundColor: 'white'}).then(dataUri => {
            const blob = dataURLToBlob(dataUri);
            saveAs(blob, fileName);
        });
    }

    undo = () => {
        this.model.history.undo();
    }

    redo = () => {
        this.model.history.redo();
    }

    zoomBy = (value: number) => {
        this.markup.paperArea.zoomBy(value);
    }

    zoomIn = () => {
        this.markup.paperArea.zoomIn();
    }

    zoomOut = () => {
        this.markup.paperArea.zoomOut();
    }

    print = () => {
        this.markup.paperArea.exportSVG().then(svg => {
            const printWindow = window.open('', undefined, 'width=1280,height=720');
            printWindow.document.write(svg);
            printWindow.print();
        });
    }

    changeLanguage = (language: string) => {
        // if onLanguageChange is set we'll just forward the change
        if (this.props.onLanguageChange) {
            this.props.onLanguageChange(language);
        } else {
            this.diagram.setLanguage(language);
            // since we have toolbar dependent on language, we're forcing update here
            this.forceUpdate();
        }
    }

    centerTo = (paperPosition?: { x: number; y: number; }) => {
        this.markup.paperArea.centerTo(paperPosition);
    }

    showTutorial = () => {
        showTutorial();
    }
}

interface ToolbarWrapperProps extends WorkspaceProps {
    workspace: Workspace;
    history: CommandHistory;
    view: DiagramView;
}

class ToolbarWrapper extends Component<ToolbarWrapperProps, {}> {
    private readonly listener = new EventObserver();
    
    componentDidMount() {
        this.listener.listen(this.props.history.events, 'changeStacks', () => {
            // update undo/redo button status
            this.forceUpdate();
        });
    }

    componentWillUnmount() {
        this.listener.stopListening();
    }

    render() {
        const {languages, onSaveDiagram, hidePanels, toolbar, workspace, history, view} = this.props;

        const undoCommand = last(history.undoStack);
        const redoCommand = first(history.redoStack);

        const toolbarProps: DefaultToolbarProps = {
            onZoomIn: workspace.zoomIn,
            onZoomOut: workspace.zoomOut,
            onZoomToFit: workspace.zoomToFit,
            onPrint: workspace.print,
            undo: {
                title: (undoCommand && undoCommand.title) ? `Undo ${undoCommand.title}` : 'Undo',
                enabled: Boolean(undoCommand),
                invoke: () => history.undo(),
            },
            redo: {
                title: (redoCommand && redoCommand.title) ? `Redo ${redoCommand.title}` : 'Redo',
                enabled: Boolean(redoCommand),
                invoke: () => history.redo(),
            },
            onExportSVG: workspace.exportSvg,
            onExportPNG: workspace.exportPng,
            onSaveDiagram: onSaveDiagram ? () => onSaveDiagram(workspace) : undefined,
            onForceLayout: () => {
                workspace.forceLayout();
                workspace.zoomToFit();
            },
            languages,
            selectedLanguage: view.getLanguage(),
            onChangeLanguage: workspace.changeLanguage,
            onShowTutorial: workspace.showTutorial,
            hidePanels,
            isLeftPanelOpen: workspace.state.isLeftPanelOpen,
            onLeftPanelToggle: () => {
                workspace.setState(prevState => ({isLeftPanelOpen: !prevState.isLeftPanelOpen}));
            },
            isRightPanelOpen: workspace.state.isRightPanelOpen,
            onRightPanelToggle: () => {
                workspace.setState(prevState => ({isRightPanelOpen: !prevState.isRightPanelOpen}));
            },
        };
        return cloneElement(
            toolbar || createElement<DefaultToolbarProps>(DefaultToolbar),
            toolbarProps
        );
    }
}

export function renderTo<WorkspaceProps>(
    workspace: React.ComponentClass<WorkspaceProps>,
    container: HTMLElement,
    props: WorkspaceProps,
) {
    ReactDOM.render(createElement(workspace, props), container);
}

export default Workspace;

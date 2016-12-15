import {DiagramModel, chooseLocalizedText, uri2name} from './model';
import {LayoutElement} from "./layoutData";
import {LocalizedString} from "../data/model";
import * as _ from 'lodash';
/**
 * Created by yuricus on 15.12.16.
 */

interface Graph {
    nodes: any[],
    edges: any[],
}

export function exportGraph(model: DiagramModel) {
    const layout = model.exportLayout();
    const layoutGraph = layout.layoutData;
    let graph : Graph = {nodes:[], edges:[]};

    for (var cell of layoutGraph.cells) {
        switch (cell.type) {
            case "element":
                const element = model.elements[cell.id].template;
                graph.nodes.push({
                    id: cell.id,
                    types: element.types.map((typeId) => { return {id: typeId, label: getLocalizedText(model.getClassesById(typeId).get("label"))}}),
                    label: getLocalizedText(element.label),
                    properties: _.map(element.properties, (
                        (prop, propId) => {return {label: uri2name(propId), value: prop[0].value.text}})
                    ),
                    image: element.image
                });
                break;
            case "link":
                graph.edges.push({
                    type: cell.typeId,
                    typeLabel: getLocalizedText(model.getLinkType(cell.typeId).label),
                    source: cell.source.id,
                    target: cell.target.id,
                });
            default:
        }
    }
    //download event
    const link: HTMLAnchorElement = <HTMLAnchorElement>document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    link.download = 'diagram.json';
    link.href = window.URL.createObjectURL(
        new Blob([JSON.stringify(graph, null, 2)], {type: 'application/json'}));
    link.click();

    console.log(graph);
}

function getLocalizedText(localizedString: { values: LocalizedString[] }) {
    return chooseLocalizedText(localizedString.values, "en").text;
}

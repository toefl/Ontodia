import { Link, FatLinkType, Cell, LinkVertex } from './elements';
import { Vector } from './geometry';
import { Command } from './history';

export function createLinkVertex(vertex: LinkVertex, location: Vector): Command {
    return Command.create('Create link vertex', () => {
        const {link, vertexIndex} = vertex;
        const vertices = [...link.vertices];
        vertices.splice(vertexIndex, 0, location);
        link.setVertices(vertices);
        return removeLinkVertex(vertex);
    });
}

export function removeLinkVertex(vertex: LinkVertex): Command {
    return Command.create('Remove link vertex', () => {
        const {link, vertexIndex} = vertex;
        const vertices = [...link.vertices];
        const [location] = vertices.splice(vertexIndex, 1);
        link.setVertices(vertices);
        return createLinkVertex(vertex, location);
    });
}

export function setLinkVertices(link: Link, vertices: ReadonlyArray<Vector>): Command {
    return Command.create('Set link vertices', () => {
        const previous = link.vertices;
        link.setVertices(vertices);
        return setLinkVertices(link, previous);
    });
}

export function makeCellMove(target: Cell, location: Vector): Command {
    const previous = Cell.getPosition(target);
    return Command.create('Move cell', () => {
        Cell.move(target, location);
        return makeCellMove(target, previous);
    });
}

export function changeLinkTypeVisibility(params: {
    linkType: FatLinkType;
    visible: boolean;
    showLabel: boolean;
    preventLoading?: boolean;
}): Command {
    const {linkType, visible, showLabel, preventLoading} = params;
    return Command.create('Change link type visibility', () => {
        const previousVisible = linkType.visible;
        const previousShowLabel = linkType.showLabel;
        linkType.setVisibility({visible, showLabel, preventLoading});
        return changeLinkTypeVisibility({
            linkType,
            visible: previousVisible,
            showLabel: previousShowLabel,
            preventLoading,
        });
    });
}

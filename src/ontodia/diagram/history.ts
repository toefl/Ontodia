import { last } from 'lodash';

import { EventSource, Events } from '../viewUtils/events';

import { DiagramModel } from './model';

export interface Command {
    title?: string;
    /** @returns Inverse command */
    invoke(context: CommandContext): Command;
}

export interface CommandContext {
    readonly model: DiagramModel;
}

export interface CommandHistoryEvents {
    changeStacks: {},
}

export class CommandHistory {
    private readonly source = new EventSource<CommandHistoryEvents>();
    readonly events: Events<CommandHistoryEvents> = this.source;

    private _undo: Command[] = [];
    private _redo: Command[] = [];
    private batches: Batch[] = [];

    private context: CommandContext;

    constructor(model: DiagramModel) {
        this.context = {model};
    }

    get undoStack(): ReadonlyArray<Command> { return this._undo; }
    get redoStack(): ReadonlyArray<Command> { return this._redo; }

    startBatch(title?: string): Batch {
        const batch = new Batch(this, title, this.context);
        this.batches.push(batch);
        return batch;
    }

    undo() {
        if (this._undo.length === 0) { return; }
        this.transmuteCommand(this._undo, this._redo);
    }

    redo() {
        if (this._redo.length === 0) { return; }
        this.transmuteCommand(this._redo, this._undo);
    }

    private transmuteCommand(from: Command[], to: Command[]) {
        const command = from.pop();
        const inverse = command.invoke(this.context);
        to.push(inverse);
        this.source.trigger('changeStacks', {});
    }

    execute(command: Command) {
        const inverse = command.invoke(this.context);
        this.registerToUndo(inverse);
    }

    registerToUndo(command: Command) {
        if (this.batches.length > 0) {
            this.batches[this.batches.length - 1].registerToUndo(command);
        } else {
            this._undo.push(command);
            this._redo.length = 0;
        }
    }

    storeBatchesUpTo(parent: Batch) {
        const index = this.batches.lastIndexOf(parent);
        if (index < 0) {
            return;
        }
        for (let i = this.batches.length - 1; i >= index; i--) {
            const {commands, title} = this.batches.pop();
            if (commands.length > 0) {
                const compound = Command.compound(commands.reverse(), title);
                this.registerToUndo(compound);
            }
        }
        this.source.trigger('changeStacks', {});
    }

    reset() {
        this._undo.length = 0;
        this._redo.length = 0;
        this.source.trigger('changeStacks', {});
    }
}

export class Batch {
    private _commands: Command[] = [];
    get commands() { return this._commands; }

    constructor(
        readonly history: CommandHistory,
        readonly title: string | undefined,
        private context: CommandContext,
    ) {}

    execute(command: Command) {
        const inverse = command.invoke(this.context);
        this.registerToUndo(inverse);
    }

    registerToUndo(command: Command) {
        this._commands.push(command);
    }

    store() {
        this.history.storeBatchesUpTo(this);
    }
}

export namespace Command {
    export function create(title: string, callback: (context: CommandContext) => Command): Command {
        return {invoke: callback, title: title};
    }

    export function compound(commands: ReadonlyArray<Command>, title?: string): Command {
        const invoke = (context: CommandContext) => {
            const inverted: Command[] = [];
            for (const command of commands) {
                const inverse = command.invoke(context);
                inverted.push(inverse);
            }
            return compound(inverted.reverse(), title);
        };
        return {title, invoke};
    }

    export function effect(title: string, effect: (context: CommandContext) => void): Command {
        const perform = create(title, context => {
            effect(context);
            return create(title, () => perform);
        });
        return perform;
    }
}

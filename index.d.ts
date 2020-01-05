import { Stream, Sink, ScheduledTask, Scheduler, Disposable } from '@most/types'

declare module '@abradley2/frpuccino' {
    export interface StreamElement<Action> extends Element {
        eventStream?: Stream<Action>;
    }

    export interface TimedAction<Action> {
        time?: number;
        action?: Action;
    }

    export type TaskCreator<Action> = (
        sink: ApplicationSink<Action>,
        scheduler: Scheduler
    ) => ScheduledTask;

    export type UpdateResult<Model, Action> =
        | Model
        | [Model, TaskCreator<Action> | TaskCreator<Action>[]]

    export interface ApplicationConfig<Model, Action> {
        mount: Element;
        init: Model;
        update: (
            model: Model,
            action: Action
        ) => UpdateResult<Model, Action>;
        view: (model: Model) => StreamElement<Action>;
        scheduler?: Scheduler;
        runTasks?: boolean;
        mapUrlChange?: (locaiton: Location) => Action;
    }

    export type ApplicationStream<Action> = Stream<ApplicationEvent<Action>>;

    export type ApplicationSink<Action> = Sink<ApplicationEvent<Action>>;

    export interface ApplicationEvent<Action> {
        view?: Element;
        task?: TaskCreator<Action> | TaskCreator<Action>[];
        eventStream: Stream<TimedAction<Action>>;
    }

    export interface Application<Model, Action> {
        applicationStream: ApplicationStream<Action>;
        applicationSink: ApplicationSink<Action>;
        scheduler: Scheduler;
        run: (action: Action) => Disposable;
        eventSource: mitt.Emitter;
        record: () => (<a, b>(app: ApplicationConfig<a, b>) => Application<a, b>);
    }

    export function createApplication<Model, Action>(config: ApplicationConfig<Model, Action>): Application<Model, Action>

    export function createElement<Action>(...args: any): StreamElement<Action>

    export function mapElement<a, b>(mapFn: (from: a) => b, toNode: StreamElement<a>): StreamElement<b>

    export function mapTaskCreator<Action, B>(mapFn: (a: Action) => B, taskCreator: TaskCreator<Action>): TaskCreator<B>

    export function mapUpdateResult<Model, ModelB, Action, ActionB>(mapModel: (m: Model) => ModelB, mapTask: (a: Action) => ActionB, updateResult: UpdateResult<Model, Action>): [ModelB, TaskCreator<ActionB>[]]

    export function getModel<Model, Action>(
        updateResult: UpdateResult<Model, Action>
    ): Model

    export function getTasks<Model, Action>(
        updateResult: UpdateResult<Model, Action>
    ): TaskCreator<Action>[]

    export function getUpdateResult<Model, Action>(
        updateResult: UpdateResult<Model, Action>
    ): [Model, TaskCreator<Action>[]]
}

import mitt from 'mitt';
import { Stream, Sink, Scheduler, Disposable, ScheduledTask } from '@most/types';
import { StreamAttributes } from './attributes';
export declare type Emitter = mitt.Emitter;
export declare const ACTION = "ACTION";
export interface StreamElement<Action> extends Element {
    eventStream?: Stream<Action>;
}
export declare function cloneNode<a>(): StreamElement<any>;
export declare function mapElement<a, b>(mapFn: (from: a) => b, toNode: StreamElement<a>): StreamElement<b>;
export interface TimedAction<Action> {
    time?: number;
    action?: Action;
}
export declare type TaskCreator<Action> = (sink: ApplicationSink<Action>, scheduler: Scheduler) => ScheduledTask;
export declare type UpdateResult<Model, Action> = Model | [Model, TaskCreator<Action> | TaskCreator<Action>[]];
export interface ApplicationConfig<Action, Model> {
    mount: Element;
    init: Model;
    update: (model: Model, action: Action, scheduler: Scheduler) => UpdateResult<Model, Action>;
    view: (model: Model) => StreamElement<Action>;
    scheduler?: Scheduler;
    runTasks?: boolean;
}
export declare type ApplicationStream<Action> = Stream<ApplicationEvent<Action>>;
export declare type ApplicationSink<Action> = Sink<TimedAction<Action> | ApplicationEvent<Action>>;
export interface ApplicationEvent<Action> {
    view?: Element;
    task?: TaskCreator<Action> | TaskCreator<Action>[];
    eventStream: Stream<TimedAction<Action>>;
}
export declare function createApplication<Model, Action>(applicationConfig: ApplicationConfig<Action, Model>): {
    applicationStream: ApplicationStream<Action>;
    applicationSink: ApplicationSink<Action>;
    scheduler: Scheduler;
    run: (action: Action) => Disposable;
    eventSource: mitt.Emitter;
};
export declare function createElement<Action>(tag: string, attributes: StreamAttributes<Action>, ...children: any[]): StreamElement<Action>;
export declare function render(target: any, elementTree: any): void;

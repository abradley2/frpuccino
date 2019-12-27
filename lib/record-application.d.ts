import { Emitter } from '../lib/browser';
import { Scheduler } from '@most/types';
export declare function record<Model, Action>(emitter: Emitter, scheduler: Scheduler): ({ mount, update, view, init }: {
    mount: any;
    update: any;
    view: any;
    init: any;
}) => void;

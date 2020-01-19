import registerUrlChangeEvent from '@abradley2/url-change-event'
import {
  startWith,
  loop,
  empty,
  merge,
  mergeArray,
  map,
  take,
  propagateEventTask,
  now
} from '@most/core'
import updateDOM from 'morphdom'
import mitt from 'mitt'
import {
  Stream,
  Sink,
  Scheduler,
  Disposable,
  Task,
  ScheduledTask
} from '@most/types'
import {
  newDefaultScheduler,
  cancelAllTasks,
  asap,
  newTimeline,
  delay
} from '@most/scheduler'
import eventList from './event-list'
import { StreamAttributes } from './attributes'
import { record } from './record-application'

export type Emitter = mitt.Emitter;

export const ACTION = 'ACTION'

export interface StreamElement<Action> extends Element {
  eventStream?: Stream<Action>;
}

export function mapElement<a, b> (mapFn: (from: a) => b, toNode: StreamElement<a> | StreamElement<b>): StreamElement<b> {
  const streamA = toNode.eventStream as Stream<a>
  const streamB = map(mapFn, streamA)

  toNode.eventStream = streamB

  return toNode as StreamElement<b>
}

export interface TimedAction<Action> {
  time?: number;
  action?: Action;
}

export type TaskCreator<Action> = (
  sink: ApplicationSink<Action>,
  scheduler: Scheduler
) => ScheduledTask;

export function mapTaskCreator<Action, B> (
  fn: (a: Action) => B,
  taskCreator: TaskCreator<Action>
): TaskCreator<B> {
  return taskGenerator(taskCreator).map(fn).createTask
}

export interface TaskGenerator<Action> {
  map: <B>(fn: (a: Action) => B) => TaskGenerator<B>
  createTask: (sink: ApplicationSink<Action>, scheduler: Scheduler) => ScheduledTask
}

// TODO: I plan on cleaning up this mess... It was VERY tricky getting this to work
export function taskGenerator<Action> (
  createTask: (sink: ApplicationSink<Action>, scheduler: Scheduler) => ScheduledTask
): TaskGenerator<Action> {
  return {
    createTask,
    map: function <B> (fn: (a: Action) => B): TaskGenerator<B> {
      const nextCreateTask = (sink: ApplicationSink<B>, scheduler: Scheduler): ScheduledTask => {
        const nextSink: ApplicationSink<Action> = {
          event: (time: number, value: ApplicationEvent<Action>) => {
            if (value.eventStream) {
              sink.event(time, {
                eventStream: map((payload) => {
                  return { action: fn(payload.action) }
                }, value.eventStream)
              })
            }
          },
          end: (t) => {
            sink.end(t)
          },
          error: (t, err) => {
            sink.error(t, err)
          }
        }

        return createTask(nextSink, scheduler)
      }
      return taskGenerator(nextCreateTask)
    }
  }
}

export type UpdateResult<Model, Action> =
  | Model
  | [Model, TaskCreator<Action> | TaskCreator<Action>[]]

export function getModel<Model, Action> (
  updateResult: UpdateResult<Model, Action>
): Model {
  return getUpdateResult(updateResult)[0]
}

export function getTasks<Model, Action> (
  updateResult: UpdateResult<Model, Action>
): TaskCreator<Action>[] {
  return getUpdateResult(updateResult)[1]
}

function unlift (v) {
  return v
}

export function getUpdateResult<Model, Action> (
  updateResult: UpdateResult<Model, Action>
): [Model, TaskCreator<Action>[]] {
  const [model, task] =
  Array.isArray(updateResult)
    ? updateResult
    : [updateResult, null]

  const tasks: TaskCreator<Action>[] = (Array.isArray(task)
    ? task
    : [task]
  ).filter(v => !!v)

  return [model, tasks]
}

export function mapUpdateResult<Model, ModelB, Action, ActionB> (
  mapModel: (m: Model) => ModelB,
  mapTask: (a: Action) => ActionB,
  updateResult: UpdateResult<Model, Action>
): [ModelB, TaskCreator<ActionB>[]] {
  const [model, tasks] = getUpdateResult(updateResult)

  const mappedTasks: TaskCreator<ActionB>[] = tasks.map((t) =>
    mapTaskCreator(
      mapTask,
      t
    )
  )

  const mappedModel = mapModel(model)

  return [
    mappedModel,
    mappedTasks
  ]
}

export interface ApplicationConfig<Model, Action> {
  mount: Element;
  init: Model;
  update: (
    model: Model,
    action: Action
  ) => UpdateResult<Model, Action>;
  view: (model: Model) => StreamElement<Action>;
  mapUrlChange?: (Location) => Action;
  scheduler?: Scheduler;
  runTasks?: boolean;
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

let registeredUrlChangeEvent
export function createApplication<Model, Action> (
  applicationConfig: ApplicationConfig<Model, Action>
): Application<Model, Action> {
  const { mount, init, update, view, runTasks, mapUrlChange } = applicationConfig

  const scheduler = applicationConfig.scheduler || newDefaultScheduler()

  const eventSource = mitt()

  const watchUrl = () => {
    eventSource.emit(ACTION, {
      action: mapUrlChange(window.location),
      time: scheduler.currentTime()
    })
  }

  if (mapUrlChange) {
    window.addEventListener('urlchange', watchUrl)
    if (!registeredUrlChangeEvent) {
      registerUrlChangeEvent()
      registeredUrlChangeEvent = true
    }
  }

  const eventStream: Stream<TimedAction<Action>> = {
    run: (sink, scheduler) => {
      const handleMsg = action => sink.event(scheduler.currentTime(), action)
      eventSource.on(ACTION, handleMsg)
      return {
        dispose: () => {
          eventSource.off(ACTION, handleMsg)
          applicationConfig.mapUrlChange && eventSource.off(ACTION, watchUrl)
        }
      }
    }
  }

  let applicationStream: Stream<{
    view?: Element;
    task?: TaskCreator<Action> | TaskCreator<Action>[];
    eventStream: Stream<TimedAction<Action>>;
  }> = loop(
    (model: Model, timedAction: TimedAction<Action>) => {
      let task
      let nextModel

      const updateResult = update(model, timedAction.action)
      if (
        Array.isArray(updateResult)
      ) {
        [nextModel, task] = updateResult
      } else {
        nextModel = updateResult
      }

      const nextView: StreamElement<Action> = view(nextModel)

      return {
        seed: nextModel,
        value: {
          view: nextView,
          task,
          eventStream: take(
            1,
            map(action => ({ action }), nextView.eventStream)
          )
        }
      }
    },
    init,
    eventStream
  )

  if (mapUrlChange) {
    applicationStream = startWith(
      { eventStream: now({ action: mapUrlChange(window.location) }) },
      applicationStream
    )
  }

  const applicationSink: Sink<ApplicationEvent<Action>> = {
    event: function (time, event) {
      if (event.view) {
        updateDOM(mount, event.view, { onBeforeElUpdated })
      }

      if (event.task && runTasks !== false) {
        const tasks = Array.isArray(event.task) ? event.task : [event.task]
        const timeline = newTimeline()

        tasks.forEach(t => {
          const task = t(applicationSink, scheduler)
          timeline.add(task)
        })
        timeline.runTasks(0, t => t.run())
      }

      const disposable = event.eventStream.run(
        {
          event: (time, timedAction) => {
            if (!timedAction.time) {
              timedAction.time = time
            }
            eventSource.emit(ACTION, timedAction)
          },
          end: () => {
            disposable.dispose()
          },
          error: (_, err) => {
            console.error(err)
            throw err
          }
        },
        scheduler
      )
    },
    end: () => { },
    error: (_, err) => {
      console.error(err)
      throw err
    }
  }

  return {
    applicationStream,
    applicationSink,
    scheduler,
    eventSource,
    run: (action: Action) => {
      const disposable = applicationStream.run(applicationSink, scheduler)

      eventSource.emit(ACTION, { time: scheduler.currentTime(), action })

      return disposable
    },
    record: () => {
      const cloneApplication = record(eventSource, scheduler)

      return (newApplication) => cloneApplication(newApplication)
    }
  }
}

function fromOnEvent<Action> (
  event,
  target: Element,
  mapFn: (event: Event) => Action
): Stream<Element> {
  let sink
  let scheduler

  const handleEvent = (event) => {
    const action = mapFn(event)
    if (sink) {
      sink.event(scheduler.currentTime(), action)
    }
  }

  if (target) {
    target.addEventListener(event, handleEvent)
  }

  return {
    run: (_sink, _scheduler) => {
      sink = _sink
      scheduler = _scheduler

      return {
        dispose: () => {
          sink = undefined
          target.removeEventListener(event, handleEvent)
        }
      }
    }
  }
}

function fromDOMEvent<Action> (
  event,
  target: Element,
  mapFn: (event: Event) => Action
): Stream<Event> {
  // we need to bind our event handler to the DOM node _immediately_ so
  // morphdom will copy it over, but the sink and scheduler aren't available
  // until the stream starts, so we need to do this clever little work around
  // here
  let sink
  let scheduler

  if (target) {
    target[event] = (e: Event) => {
      if (sink) sink.event(scheduler.currentTime(), e)
    }
    target[event].mapFn = mapFn
  }

  return {
    run: (_sink, _scheduler) => {
      sink = _sink
      scheduler = _scheduler

      return {
        dispose: () => {
          sink = undefined
        }
      }
    }
  }
}

export function createElement<Action> (
  tag: string,
  attributes: StreamAttributes<Action>,
  ...children
): StreamElement<Action> {
  const el: StreamElement<Action> = document.createElement(tag)

  el.eventStream = empty()

  if (attributes) {
    Object.keys(attributes).forEach(function (name) {
      const val = attributes[name]
      if (eventList[name] && val) {
        const mapEvent = val.constructor === Function ? val : () => val
        el.eventStream = merge(
          el.eventStream,
          map(
            mapEvent,
            fromDOMEvent(name, el, mapEvent)
          )
        )
        return
      }
      if (['className', 'id'].indexOf(name) !== -1) {
        el[name] = val
        return
      }

      if (typeof val === 'undefined' || val === null) {
        return
      }
      if (name[0] === '$') {
        if (name === '$on') {
          val.forEach(config => {
            el.eventStream = merge(
              el.eventStream,
              fromOnEvent(config.event, el, config.handler)
            )
          })
        }
      } else {
        el.setAttribute(name, val)
      }
    })
  }

  children.forEach(function appendChild (child) {
    if (typeof child === 'number') {
      const textNode = document.createTextNode(child.toString())
      el.appendChild(textNode)
      return
    }

    if (!child) {
      return
    }

    if (child && child.constructor === String) {
      const textNode = document.createTextNode(child)
      el.appendChild(textNode)
      return
    }

    if (Array.isArray(child)) {
      child.forEach(appendChild)
      return
    }

    el.appendChild(child)

    el.eventStream = merge(el.eventStream, child.eventStream)
    child.eventStream = null
  })

  return el
}

export function render (target, elementTree) {
  if (target.children.length === 0) {
    target.appendChild(elementTree)
  }
  const treeRoot = target.children[0]
  updateDOM(treeRoot, elementTree, { onBeforeElUpdated })
}

// morphdom does not copy over event handlers so they need to be re-bound
function onBeforeElUpdated (fromEl: Element, toEl: Element): boolean {
  Object.keys(eventList).forEach(eventHandler => {
    if (toEl[eventHandler]) {
      fromEl[eventHandler] = toEl[eventHandler]
    } else if (fromEl[eventHandler]) {
      fromEl[eventHandler] = undefined
    }
  })
  return true
}

function isAction<Action> (
  sut: TimedAction<Action> | ApplicationEvent<Action>
): sut is TimedAction<Action> {
  const applicationEvent = sut as ApplicationEvent<Action>
  return !applicationEvent.eventStream
}

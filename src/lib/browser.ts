import {
  startWith,
  loop,
  empty,
  merge,
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

export type Emitter = mitt.Emitter;

export const ACTION = 'ACTION'

export interface StreamElement<Action> extends Element {
  eventStream?: Stream<Action>;
}

export interface TimedAction<Action> {
  time?: number;
  action?: Action;
}

export type TaskCreator<Action> = (
  scheduler: Scheduler,
  sink: Sink<{ eventStream: Stream<TimedAction<Action>> }>
) => ScheduledTask;

export type UpdateResult<Model, Action> = Model | [Model, TaskCreator<Action> | TaskCreator<Action>[]]

export interface ApplicationConfig<Action, Model> {
  mount: Element;
  init: Model;
  update: (
    model: Model,
    action: Action,
    scheduler: Scheduler
  ) => UpdateResult<Model, Action>;
  view: (model: Model) => StreamElement<Action>;
  scheduler?: Scheduler;
  runTasks?: boolean;
}

export type ApplicationStream<Action> = Stream<{
  view: Element;
  task?: TaskCreator<Action> | TaskCreator<Action>[];
  eventStream: Stream<TimedAction<Action>>;
}>;

export type ApplicationSink<Action> = Sink<{
  view?: Element;
  task?: TaskCreator<Action> | TaskCreator<Action>[];
  eventStream: Stream<TimedAction<Action>>;
}>;

export function createActionEvent<Action> (
  action: Action,
  scheduler: Scheduler
): {
  eventStream: Stream<TimedAction<Action>>;
} {
  return {
    eventStream: now({
      time: scheduler.currentTime(),
      action
    })
  }
}

export function createApplication<Model, Action> (
  applicationConfig: ApplicationConfig<Action, Model>
): {
  applicationStream: ApplicationStream<Action>;
  applicationSink: ApplicationSink<Action>;
  scheduler: Scheduler;
  run: (action: Action) => Disposable;
  eventSource: mitt.Emitter;
} {
  const { mount, init, update, view, runTasks } = applicationConfig

  const scheduler = applicationConfig.scheduler || newDefaultScheduler()

  const eventSource = mitt()
  const eventStream: Stream<TimedAction<Action>> = {
    run: (sink, scheduler) => {
      const handleMsg = action => sink.event(scheduler.currentTime(), action)
      eventSource.on(ACTION, handleMsg)
      return {
        dispose: () => {
          eventSource.off(ACTION, handleMsg)
        }
      }
    }
  }

  const applicationStream: Stream<{
    view: Element;
    task?: TaskCreator<Action> | TaskCreator<Action>[];
    eventStream: Stream<TimedAction<Action>>;
  }> = loop(
    (model: Model, timedAction: TimedAction<Action>) => {
      let task
      let nextModel

      const updateResult = update(model, timedAction.action, scheduler)
      if (
        Array.isArray(updateResult) &&
        typeof updateResult[1] === 'function'
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

  const applicationSink: Sink<{
    view: Element;
    task?: TaskCreator<Action> | TaskCreator<Action>[];
    eventStream: Stream<TimedAction<Action>>;
  }> = {
    event: function (time, event) {
      if (event.view) {
        updateDOM(mount, event.view, { onBeforeElUpdated })
      }

      if (event.task && runTasks !== false) {
        const tasks = Array.isArray(event.task) ? event.task : [event.task]
        const timeline = newTimeline()

        tasks.forEach(t => {
          const task = t(scheduler, applicationSink)
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
    end: () => {},
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
    }
  }
}

function fromDOMEvent (event, target: Element): Stream<Event> {
  // we need to bind this to the element _immediately_ or else this
  // won't be here for morphdoms onBeforeElUpdated hook
  let sink
  let scheduler

  if (target) {
    target[event] = (e: Event) => {
      if (sink) sink.event(scheduler.currentTime(), e)
    }
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
        el.eventStream = merge(
          el.eventStream,
          map(
            val.constructor === Function ? val : () => val,
            fromDOMEvent(name, el)
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
      el.setAttribute(name, val)
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

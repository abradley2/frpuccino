import { startWith, loop, empty, merge, map, take } from '@most/core'
import updateDOM from 'morphdom'
import mitt from 'mitt'
import { Stream, Sink, Scheduler, Disposable } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'
import eventList from './event-list'
import { StreamAttributes } from './attributes'

export interface StreamElement<Msg> extends Element {
  eventStream?: Stream<Msg>;
}

export function createApplication<Model, Msg> (
  mount: Element,
  init: Model,
  update: (model: Model, msg: Msg) => Model,
  view: (model: Model) => StreamElement<Msg>
): {
  applicationStream: Stream<{ view: Element; eventStream: Stream<Msg> }>;
  eventSink: Sink<{ view?: Element; eventStream: Stream<Msg> }>;
  scheduler: Scheduler;
  run: () => Disposable;
  startTime: () => number | undefined;
} {
  let startTime // we set this when _run_ is called
  const scheduler = newDefaultScheduler()

  const eventSource = mitt()
  const eventStream: Stream<Msg> = {
    run: (sink, scheduler) => {
      const handleMsg = msg => sink.event(scheduler.currentTime(), msg)
      eventSource.on('msg', handleMsg)
      return {
        dispose: () => {
          eventSource.off('msg', handleMsg)
        }
      }
    }
  }

  const applicationStream: Stream<{
    view: Element;
    eventStream: Stream<Msg>;
  }> = loop(
    (model: Model, msg: Msg) => {
      const nextModel = update(model, msg)
      const nextView: StreamElement<Msg> = view(nextModel)

      return {
        seed: nextModel,
        value: {
          view: nextView,
          eventStream: nextView.eventStream
        }
      }
    },
    init,
    startWith({}, eventStream)
  )

  const eventSink: Sink<{ view: Element; eventStream: Stream<Msg> }> = {
    event: function (time, event) {
      if (event.view) updateDOM(mount, event.view, { onBeforeElUpdated })

      const disposable = event.eventStream.run(
        {
          event: (time, event) => {
            eventSource.emit('msg', {
              ...event,
              $time: scheduler.currentTime()
            })
          },
          end: () => {
            disposable.dispose()
          },
          error: err => {
            console.error(err)
            throw err
          }
        },
        scheduler
      )
    },
    end: () => {},
    error: err => {
      console.error(err)
      throw err
    }
  }

  return {
    applicationStream,
    eventSink,
    scheduler,
    run: () => {
      startTime = scheduler.currentTime()
      return applicationStream.run(eventSink, scheduler)
    },
    startTime: () => startTime
  }
}

export function fromDOMEvent (event, query: string | Element): Stream<Event> {
  // we need to bind this to the element _immediately_ or else this
  // won't be here for morphdoms onBeforeElUpdated hook
  let sink
  let scheduler

  const target = query

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

export function createElement<Msg> (tag: string, attributes: StreamAttributes<Msg>, ...children): StreamElement<Msg> {
  const el: StreamElement<Msg> = document.createElement(tag)

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

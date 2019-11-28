import { startWith, loop, empty, merge, map, take } from '@most/core'
import updateDOM from 'morphdom'
import mitt from 'mitt'
import { Stream, Sink, Scheduler } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'
import eventList from './event-list'

export interface StreamElement<Msg> extends Element {
  eventStream: Stream<Msg>;
}

export function createApplication<Model, Msg> (
  mount: Element,
  init: Model,
  update: (model: Model, msg: Msg) => Model,
  view: (model: Model) => Element,
  _eventStream?: Stream<Msg>
): {
  applicationStream: Stream<{ view: Element; events: Stream<Msg> }>;
  eventSink: Sink<{ view: Element; events: Stream<Msg> }>;
  scheduler: Scheduler;
  run: () => void;
} {
  const scheduler = newDefaultScheduler()

  const eventSource = mitt()
  const eventStream: Stream<Msg> = merge(
    {
      run: (sink, scheduler) => {
        const handleMsg = msg => sink.event(scheduler.currentTime(), msg)
        eventSource.on('msg', handleMsg)
        return {
          dispose: () => {
            eventSource.off('msg', handleMsg)
          }
        }
      }
    },
    _eventStream || empty()
  )

  const applicationStream: Stream<{
    view: Element;
    events: Stream<Msg>;
  }> = loop(
    (model: Model, msg: Msg) => {
      const nextModel = update(model, msg)
      const nextView = view(nextModel)
      const events = nextView['eventStream'.toString()] // fuck off typescript

      return {
        seed: nextModel,
        value: {
          view: nextView,
          events
        }
      }
    },
    init,
    startWith({}, eventStream)
  )

  const eventSink: Sink<{ view: Element; events: Stream<Msg> }> = {
    event: function (time, event) {
      updateDOM(mount, event.view, { onBeforeElUpdated })

      const disposable = take(1, event.events).run(
        {
          event: (time, event) => {
            eventSource.emit('msg', {
              ...event,
              $time: scheduler.currentTime()
            })
            disposable.dispose()
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
      applicationStream.run(eventSink, scheduler)
    }
  }
}

export function fromDOMEvent (event, query: string | Element): Stream<Event> {
  // we need to bind this to the element _immediately_ or else this
  // won't be here for morphdoms onBeforeElUpdated hook
  let sink
  let scheduler

  const target =
    typeof query === 'string' ? document.querySelector(query) : query

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

export function createElement (tag, attributes, ...children) {
  const el = document.createElement(tag)

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

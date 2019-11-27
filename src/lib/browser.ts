import { startWith, loop, empty, merge, map } from '@most/core'
import updateDOM from 'morphdom'
import mitt from 'mitt'
import { Stream, Sink } from '@most/types'
import { newDefaultScheduler } from '@most/scheduler'
import eventList from './event-list'

export interface StreamElement<Msg> extends Element {
  eventStream: Stream<Msg>;
}

export function createApplication<Model, Msg> (
  mount: Element,
  init: Model,
  update: (model: Model, msg: Msg) => Model,
  view: (model: Model) => Element
): void {
  const scheduler = newDefaultScheduler()

  const emitter = mitt()
  const eventSource: Stream<Msg> = {
    run: (sink, scheduler) => {
      const handleMsg = msg => sink.event(scheduler.currentTime(), msg)
      emitter.on('msg', handleMsg)
      return {
        dispose: () => {
          emitter.off('msg', handleMsg)
        }
      }
    }
  }

  const application: Stream<{ view: Element; events: Stream<Msg> }> = loop(
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
    startWith({}, eventSource)
  )

  const runtime: Sink<{ view: Element; events: Stream<Msg> }> = {
    event: function (time, event) {
      updateDOM(mount, event.view, { onBeforeElUpdated })

      const disposable = event.events.run(
        {
          event: (time, event) => {
            emitter.emit('msg', event)
            disposable.dispose()
          },
          end: () => {
            disposable.dispose()
          },
          error: () => {}
        },
        scheduler
      )
    },
    end: () => {},
    error: err => {
      throw err
    }
  }

  application.run(runtime, scheduler)
}

export function fromDOMEvent (event, query: string | Element): Stream<Event> {
  return {
    run: (sink, scheduler) => {
      const target =
        typeof query === 'string' ? document.querySelector(query) : query

      if (target) {
        target[event] = (e: Event) => {
          sink.event(scheduler.currentTime(), e)
        }
      }

      return {
        dispose: () => {}
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
      if (eventList[name]) {
        el.eventStream = merge(
          el.eventStream,
          map(val, fromDOMEvent(name, el))
        )
        return
      }
      if (['className', 'id'].indexOf(name) !== -1) {
        el[name] = val
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
    }
  })
  return true
}

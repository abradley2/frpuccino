/** @jsx createElement */
import tape from 'tape'
import highland from 'highland'
import { newDefaultScheduler, asap } from '@most/scheduler'
import {
  propagateEventTask,
  now
} from '@most/core'
import {
  mapElement,
  createElement,
  createApplication,
  TaskCreator
} from '../src'

Object.assign(window, { createElement })

const test = tape.createHarness()

highland(test.createStream())
  .reduce('', (a, b) => a + b)
  .toPromise(Promise).then((result) => {
    const pre = document.createElement('pre')
    pre.setAttribute('style', 'padding: 16px;')
    pre.innerText = result
    document.body.appendChild(pre)
  })

test('mapElement nesting', function (t) {
  t.plan(1)
  t.timeoutAfter(100)

  function one () {
    return <div data-id="one">
      {mapElement(
        (payload: object) => ({ one: true, ...payload }),
        two()
      )}
    </div>
  }

  function two () {
    return <div data-id="two">
      {mapElement(
        (payload: object) => ({ two: true, ...payload }),
        three()
      )}
    </div>
  }

  function three () {
    return <div id="three">
      <button onclick={{ three: true }} data-id="click-me">Click me</button>
    </div>
  }

  const el = one()

  el.eventStream.run({
    event: (_, e) => {
      t.deepEqual(e, { one: true, two: true, three: true })
    }
  }, newDefaultScheduler())

  el.querySelector('[data-id="click-me"]').dispatchEvent(new Event('click'))
})

test('propagateEventTask works as expected', function (t) {
  t.plan(1)
  t.timeoutAfter(100)

  const DONE = Symbol('DONE')

  function propagateEvent<a> (action: a): TaskCreator<a> {
    const event = { eventStream: now({ action }) }

    return (sink, scheduler) => {
      const task = propagateEventTask(event, sink)

      return asap(task, scheduler)
    }
  }

  const disposable = createApplication({
    mount: document.createElement('div'),
    init: 0,
    update: (model, action) => {
      if (action === DONE) {
        disposable.dispose()
        t.pass('Received task')
      }
      return [model, propagateEvent(DONE)]
    },
    view: () => <div />
  })
    .run(0)
})

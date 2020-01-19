/** @jsx createElement */
import tape from 'tape'
import highland from 'highland'
import {
  newDefaultScheduler,
  asap,
  delay
} from '@most/scheduler'
import {
  propagateEventTask,
  now
} from '@most/core'
import {
  mapElement,
  createElement,
  createApplication,
  TaskCreator,
  mapTaskCreator
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

test('mapTaskCreator works as expected', function (t) {
  t.plan(1)
  t.timeoutAfter(1000)

  const mount = document.createElement('div')

  const disposable = createApplication({
    view: () => <h3>hello</h3>,
    mount,
    init: 0,
    update: (model, action) => {
      if (action === 1) {
        const taskCreator: TaskCreator<number> = (sink, scheduler) => {
          const action = 2
          const task = propagateEventTask(
            { eventStream: now({ action }) },
            sink
          )
          // TODO: investigate why "asap" is problematic with
          // synchronously starting streams
          return delay(1, task, scheduler)
        }

        return [
          model,
          mapTaskCreator(
            (v: number) => v * 2,
            taskCreator
          )
        ]
      }
      if (action === 4) {
        t.pass('Task creator mapped 2 * 2 as expected')
      }
      return model
    }
  })
    .run(1)
})

test('mapElement works when converting types', function (t) {
  t.plan(2)
  t.timeoutAfter(100)

  function input () {
    return <div>
      <input value="1000" onchange={(e) => e.target.value} />
    </div>
  }

  function view (model) {
    return <div>
      <div>
        {mapElement(
          (payload: string) => {
            const result = parseInt(payload, 10)
            if (!Number.isNaN(result)) return result
            return 0
          },
          input()
        )}
      </div>
      <h3>{model}</h3>
    </div>
  }

  const el = view(0)

  el.eventStream.run({
    event: (_, e) => {
      t.ok(typeof e === 'number', 'converted to number')
      t.ok(!Number.isNaN(e), 'isnt NaN')
    }
  }, newDefaultScheduler())

  el.querySelector('input').dispatchEvent(new Event('change'))
})

const BEEP_BOOP = 'beep-boop'

class BeepBoop extends HTMLElement {
  constructor () {
    super()
    this.addEventListener('click', () => {
      const ev = new CustomEvent(BEEP_BOOP, { detail: BEEP_BOOP })
      this.dispatchEvent(ev)
    })
  }
}

window.customElements.define('beep-boop', BeepBoop)

test('renders custom elements', function (t) {
  t.plan(1)
  t.timeoutAfter(100)

  const el = <div>
    <beep-boop />
  </div>

  t.ok(
    el.firstChild instanceof BeepBoop,
    'correctly mounts a custom element'
  )
})

test('handles custom element events', function (t) {
  t.plan(1)
  t.timeoutAfter(100)

  const view = <div>
    <beep-boop
      $properties={[
        { name: 'customPropery', value: BEEP_BOOP }
      ]}
      $on={[
        {
          event: BEEP_BOOP,
          handler: (e) => {
            return {
              type: e.detail
            }
          }
        }
      ]}
    />
  </div>

  const customEl = view.firstChild

  view.eventStream.run({
    event: (_, e) => {
      t.ok(
        e && e.type === BEEP_BOOP,
        'correctly handled a custom event'
      )
    }
  }, newDefaultScheduler())

  const clickEvent = new Event('click')
  customEl.dispatchEvent(clickEvent)
})

/** @jsx createElement */
import {
  createApplication,
  createElement,
  StreamElement
} from './lib/browser'
import { record } from './lib/record-application'
import { propagateEventTask, now, at } from '@most/core'
import { newTimeline, schedulerRelativeTo, delay } from '@most/scheduler'
import { Task } from '@most/types'

Object.assign(window, { createElement }) // why do I have to do this??

interface Model {
  count: number;
  hideCounter: boolean;
  disableCounter: boolean;
  message: string;
  alphaFocused: boolean;
  bravoFocused: boolean;
}

const init: Model = {
  count: 0,
  disableCounter: true,
  hideCounter: false,
  message: '',
  alphaFocused: false,
  bravoFocused: false
}

type Action =
  | { type: "__INIT__" }
  | { type: "NOOP" }
  | { type: "DISABLE_COUNTER" }
  | { type: "BUTTON_CLICKED" }
  | { type: "HIDE_COUNTER" }
  | { type: "INPUT_CHANGED"; value: string }
  | { type: "TOGGLE_ALPHA_FOCUS"; value: boolean }
  | { type: "TOGGLE_BRAVO_FOCUS"; value: boolean };

function view (model: Model) {
  return (
    <div>
      <div>
        <button onclick={{ type: 'HIDE_COUNTER' }}>
          {model.hideCounter ? 'show' : 'hide'} counting button
        </button>
        <button onclick={() => ({ type: 'DISABLE_COUNTER' })}>
          {model.disableCounter ? 'Enable counter' : 'Disable counter'}
        </button>
        {!model.hideCounter && (
          <button
            id="counter"
            onclick={() => ({ type: 'BUTTON_CLICKED' })}
          >
            Clicked {model.count} times!
          </button>
        )}
      </div>
      <div>
        <input
          value={model.message}
          oninput={e => {
            return {
              type: 'INPUT_CHANGED',
              value: e.target.value
            }
          }}
        />
        <h3>{model.message}</h3>
      </div>
      <div>
        <input
          onfocus={() => ({ type: 'TOGGLE_ALPHA_FOCUS', value: true })}
          onblur={() => ({ type: 'TOGGLE_ALPHA_FOCUS', value: false })}
        />
        <div>{model.alphaFocused ? 'FOCUSED' : 'BLURRED'}</div>
      </div>
      <div>
        <input
          onfocus={() => ({ type: 'TOGGLE_BRAVO_FOCUS', value: true })}
          onblur={() => ({ type: 'TOGGLE_BRAVO_FOCUS', value: false })}
        />
        <div>{model.bravoFocused ? 'FOCUSED' : 'BLURRED'}</div>
      </div>
    </div>
  )
}
// - maybe for the same reason all those custom PC builds are gargantuan towers
function update (model: Model, action: Action): Model {
  switch (action.type) {
    case 'BUTTON_CLICKED':
      return { ...model, count: model.count + 1 }

    case 'INPUT_CHANGED':
      return { ...model, message: action.value }

    case 'HIDE_COUNTER':
      return { ...model, hideCounter: !model.hideCounter }

    case 'DISABLE_COUNTER':
      return { ...model, disableCounter: !model.disableCounter }
    case 'TOGGLE_ALPHA_FOCUS':
      return { ...model, alphaFocused: action.value }
    case 'TOGGLE_BRAVO_FOCUS':
      return { ...model, bravoFocused: action.value }
    default:
      return model
  }
}

const { run, scheduler, eventSource } = createApplication({
  mount: document.getElementById('app'),
  init,
  update,
  view
})

const playback = record(
  eventSource,
  scheduler
)

const disposable = run({ type: '__INIT__' })

setTimeout(cloneApplication, 5000)

function cloneApplication () {
  const appClone = document.createElement('div')
  document.body.appendChild(appClone)

  disposable.dispose()

  playback({
    mount: appClone,
    init,
    update,
    view
  })
}

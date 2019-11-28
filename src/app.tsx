/** @jsx createElement */
import { createApplication, createElement } from './lib/browser'

interface Model {
  count: number;
  message: string;
}

const init: Model = {
  count: 0,
  message: ''
}

type Msg =
  | { type: 'BUTTON_CLICKED' }
  | { type: 'INPUT_CHANGED'; value: string };

function view (model: Model) {
  return (
    <div>
      <div>
        <button onclick={() => ({ type: 'BUTTON_CLICKED' })}>
          Clicked {model.count} times!
        </button>
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
    </div>
  )
}

function update (model: Model, msg: Msg) {
  switch (msg.type) {
    case 'BUTTON_CLICKED':
      return { ...model, count: model.count + 1 }

    case 'INPUT_CHANGED':
      return { ...model, message: msg.value }

    default:
      return model
  }
}

const { run } = createApplication(
  document.getElementById('app'),
  init,
  update,
  view
)

run()

Object.assign(window, { createElement }) // why do I have to do this??

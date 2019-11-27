/** @jsx createElement */
import { createApplication, createElement } from './lib/browser'

Object.assign(window, { createElement }) // why do I have to do this??

function view (model) {
  return (
    <div>
      <button onclick={() => ({ type: 'BUTTON_CLICKED' })}>
        Clicked {model.toString()} times!
      </button>
    </div>
  )
}

function update (model, msg) {
  switch (msg.type) {
    case 'BUTTON_CLICKED':
      return model + 1

    default:
      return model
  }
}

createApplication(document.getElementById('app'), 0, update, view)

/** @jsx createElement */
import { createElement, createApplication } from '../lib/browser'
Object.assign(window, { createElement })

interface State {
  count: number;
}

const init: State = {
  count: 0
}

type Action =
  | { type: 'START' }
  | { type: 'INCREMENT' }

function update (state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }
    default:
      return state
  }
}

function view (state: State) {
  return <button onclick={{ type: 'INCREMENT' }}>
    Clicked {state.count} times
  </button>
}

const mount = document.createElement('div')
document.body.appendChild(mount)

createApplication({
  mount,
  init,
  update,
  view
}).run({ type: 'START' })

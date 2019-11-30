/** @jsx createElement */
import { createElement, createApplication, TimedAction } from '../lib/browser'

const mount = document.createElement('div')
document.body.appendChild(mount)

interface State {
  count: number;
}

const init: State = {
  count: 0
}

type Action =
  | { type: 'INCREMENT' }

function update (state: State, timedAction: TimedAction<Action>): State {
  const { action } = timedAction
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

const { applicationStream, applicationSink, scheduler } = createApplication({
  mount,
  init,
  update,
  view
})

applicationStream.run(applicationSink, scheduler)

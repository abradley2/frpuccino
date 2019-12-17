/** @jsx createElement */
import {
  createElement,
  createApplication,
  UpdateResult,
  createActionEvent,
  ApplicationSink,
  TaskCreator
} from '../lib/browser'
import { record } from '../lib/record-application'
import { now } from '@most/core'
import { Scheduler, Task, ScheduledTask } from '@most/types'
import { asap } from '@most/scheduler'

Object.assign(window, { createElement })

/** TYPES */

interface Todo {
  uniqueId?: string;
  title: string;
  completed: boolean;
}

interface Model {
  newTodoTitle: string;
  todos: Todo[];
}

/** ACTIONS */

const INIT = 'INIT'
const TODO_CREATED = 'TODO_CREATED'
const NEW_TODO_EDITED = 'NEW_TODO_EDITED'
const ADD_TODO_CLICKED = 'ADD_TODO_CLICKED'

interface Init {
  type: typeof INIT;
}

interface AddTodoClicked {
  type: typeof ADD_TODO_CLICKED;
}

interface TodoCreated {
  type: typeof TODO_CREATED;
  uniqueId: string;
  title: string;
}

interface NewTodoEdited {
  type: typeof NEW_TODO_EDITED;
  value: string;
}

type Action = Init | NewTodoEdited | AddTodoClicked | TodoCreated;

/** ACTION CREATORS */

function addTodoClicked (): Action {
  return {
    type: ADD_TODO_CLICKED
  }
}

function newTodoEdited (value: string): Action {
  return {
    type: NEW_TODO_EDITED,
    value
  }
}

/** APPLICATION */

const init: Model = {
  newTodoTitle: '',
  todos: []
}

function createTodoTask (title: string) {
  return function (
    scheduler: Scheduler,
    sink: ApplicationSink<Action>
  ): ScheduledTask {
    return asap(
      {
        run: () => {
          const time = scheduler.currentTime()

          const action: Action = {
            type: TODO_CREATED,
            uniqueId: `${Math.random().toString().split('.')[1]}:${Date.now()}`,
            title
          }

          const event = {
            eventStream: now({ time, action })
          }

          sink.event(time, event)
        },
        error: () => {},
        dispose: () => {}
      },
      scheduler
    )
  }
}

function update (model: Model, action: Action): UpdateResult<Model, Action> {
  switch (action.type) {
    case NEW_TODO_EDITED:
      return { ...model, newTodoTitle: action.value }
    case ADD_TODO_CLICKED:
      return [
        {
          ...model,
          newTodoTitle: ''
        },
        createTodoTask(model.newTodoTitle)
      ]
    case TODO_CREATED:
      return {
        ...model,
        todos: model.todos.concat([
          {
            uniqueId: action.uniqueId,
            title: action.title,
            completed: false
          }
        ])
      }
    default:
      return model
  }
}

function view (model: Model) {
  return (
    <div>
      <div>
        <input
          value={model.newTodoTitle}
          oninput={e => newTodoEdited(e.target.value)}
        />
        <button onclick={addTodoClicked}>SUBMIT</button>
      </div>
      <div>
        {model.todos.map(todo => {
          return (
            <div>
              <b>{todo.title}</b>
              <br />
              <small>{todo.uniqueId}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const mount = document.getElementById('app')

const { run, scheduler, eventSource } = createApplication({
  mount,
  init,
  update,
  view
})

const playback = record(
  eventSource,
  scheduler
)

const disposable = run({ type: INIT })

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

document.getElementById('playback').addEventListener('click', function () {
  cloneApplication()
  this.parentElement.removeChild(this)
})

/** @jsx createElement */
import { createElement, createApplication, TimedMsg, TaskCreator } from './lib/browser'
import * as Fluture from 'fluture'
import { run, map, take, now, propagateTask } from '@most/core'
import { asap } from '@most/scheduler'
import { Scheduler, Sink, Stream, Task, ScheduledTask } from '@most/types'

Object.assign(window, { createElement })

interface State {
  count: number;
}

const init: State = {
  count: 0
}

const INCREMENT = 'INCREMENT'
interface IncrementAction {
  type: typeof INCREMENT;
}

type Action = IncrementAction;

const makeRequest = () => {
  return {
    run: (sink, scheduler) => {
      const interval = setInterval(() => {
        const time = scheduler.currentTime()
        const eventStream = now({
          time,
          msg: {
            type: INCREMENT,
            value: 100
          }
        })
        sink.event(time, { eventStream })
      }, 100)

      return { dispose: () => clearInterval(interval) }
    }
  }
}

function createTimeoutTask (scheduler: Scheduler, sink): ScheduledTask {
  let disposable

  const task = {
    run: () => {
      disposable = makeRequest().run(sink, scheduler)
      setTimeout(() => task.error(scheduler.currentTime(), new Error('bad')), 2000)
    },
    error: (t, err) => {
      console.log('caught!', err && err.message)
      if (disposable) disposable.dispose()
    },
    dispose: () => {
      if (disposable) disposable.dispose()
    }
  }

  return asap(task, scheduler)
}

function update (state: State, timedMsg: TimedMsg<Action>): State | [State, TaskCreator<Action>] {
  const action = timedMsg.msg
  switch (action.type) {
    case INCREMENT:
      return { ...state, count: state.count + 1 }
    default:
      return [state, createTimeoutTask]
  }
}

function view (state: State) {
  const onClickedIncrement: IncrementAction = { type: INCREMENT }

  return (
    <div>
      <button onclick={onClickedIncrement}>Clicked {state.count} times!</button>
    </div>
  )
}

const { applicationSink, applicationStream, scheduler } = createApplication({
  init,
  view,
  update,
  mount: document.getElementById('app')
})

applicationStream.run(applicationSink, scheduler)

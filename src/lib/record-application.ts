import {
  createApplication,
  Emitter,
  ACTION,
  TimedAction
} from '../lib/browser'
import { Scheduler } from '@most/types'
import { schedulerRelativeTo, delay, asap } from '@most/scheduler'
import { propagateEventTask, now, at, merge, mergeArray } from '@most/core'

export function record<Model, Action>(emitter: Emitter, scheduler: Scheduler) {
  let startTime
  const actions = []

  const handleAction = (timedAction: TimedAction<Action>) => {
    if (!startTime && timedAction.time) startTime = timedAction.time - 500
    actions.push(timedAction)
  }

  emitter.on(ACTION, handleAction)

  return function playback({ mount, update, view, init }) {
    emitter.off(ACTION, handleAction)

    const replayScheduler = schedulerRelativeTo(
      (startTime - scheduler.currentTime()) * -1,
      scheduler
    )

    const {
      applicationSink,
      applicationStream
    } = createApplication({
      view,
      update,
      init,
      mount,
      scheduler: replayScheduler,
      runTasks: false
    })

    const eventStream = mergeArray(actions.map((action) => {
      return at(action.time, action)
    }))

    merge(applicationStream, eventStream).run(applicationSink, replayScheduler)
  }
}

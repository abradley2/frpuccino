import {
  createApplication,
  Emitter,
  ACTION,
  TimedAction,
  ApplicationConfig
} from '../lib/browser'
import { Scheduler } from '@most/types'
import { schedulerRelativeTo, delay, asap } from '@most/scheduler'
import { propagateEventTask, now, at, merge, mergeArray } from '@most/core'

export function record<Model, Action> (emitter: Emitter, scheduler: Scheduler) {
  let startTime
  const actions = []

  const handleAction = (timedAction: TimedAction<Action>) => {
    if (!startTime && timedAction.time) startTime = timedAction.time - 500
    actions.push(timedAction)
  }

  emitter.on(ACTION, handleAction)

  return function playback (config: ApplicationConfig<Model, Action>) {
    const { mount, update, view, init, mapUrlChange } = config

    emitter.off(ACTION, handleAction)

    const replayScheduler = schedulerRelativeTo(
      (startTime - scheduler.currentTime()) * -1,
      scheduler
    )

    const application = createApplication({
      view,
      update,
      init,
      mount,
      mapUrlChange,
      scheduler: replayScheduler,
      runTasks: false
    })

    const { applicationSink, applicationStream } = application

    const eventStream = mergeArray(actions)

    const run = () => merge(applicationStream, eventStream)
      .run(applicationSink, replayScheduler)

    return { application, run }
  }
}

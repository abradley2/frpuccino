import {
  createApplication,
  Emitter,
  ACTION,
  TimedAction
} from '../lib/browser'
import { Scheduler } from '@most/types'
import { schedulerRelativeTo, newTimeline, delay } from '@most/scheduler'
import { propagateEventTask, now } from '@most/core'

export function record<Model, Action> (emitter: Emitter, scheduler: Scheduler) {
  let startTime
  const actions = []

  const handleAction = (timedAction: TimedAction<Action>) => {
    if (!startTime && timedAction.time) startTime = timedAction.time - 500
    actions.push(timedAction)
  }

  emitter.on(ACTION, handleAction)

  return function playback ({ mount, update, view, init }) {
    emitter.off(ACTION, handleAction)

    const replayScheduler = schedulerRelativeTo(
      (startTime - scheduler.currentTime()) * -1,
      scheduler
    )

    const {
      applicationSink,
      applicationStream,
      eventSource
    } = createApplication({
      view,
      update,
      init,
      mount,
      scheduler: replayScheduler,
      runTasks: false
    })

    const timeline = newTimeline()

    actions.forEach(timedAction => {
      const task = delay(
        timedAction.time - startTime,
        propagateEventTask({ eventStream: now(timedAction) }, applicationSink),
        replayScheduler
      )

      timeline.add(task)
    })

    applicationStream.run(applicationSink, replayScheduler)

    timeline.runTasks(replayScheduler.currentTime(), t => t.run())
  }
}

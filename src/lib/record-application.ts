import {
  ApplicationConfig,
  ApplicationSink,
  createApplication
} from '../lib/browser'
import { Scheduler } from '@most/types'
import { schedulerRelativeTo, newTimeline, delay } from '@most/scheduler'
import { propagateEventTask } from '@most/core'

function record<Model, Action> (
  _applicationSink: ApplicationSink<Action>,
  _scheduler: Scheduler
) {
  let startTime
  const events = []

  _applicationSink.event = (fn => (time, event) => {
    if (!startTime) {
      startTime = time
    }
    events.push({ time, event })
    return fn.call(_applicationSink, time, event)
  })(_applicationSink.event)

  const playback = (mount, view, init, update) => {
    const scheduler = schedulerRelativeTo(
      startTime - _scheduler.currentTime(),
      _scheduler
    )
    const { applicationSink, applicationStream, run } = createApplication({
      mount,
      init,
      view,
      update,
      scheduler
    })

    applicationStream.run(applicationSink, scheduler)

    const timeline = newTimeline()

    events.forEach(({ time, event }) => {
      const taskDelay = time - startTime

      timeline.add(
        delay(
          time - startTime,
          propagateEventTask(event, applicationSink),
          scheduler
        )
      )
    })

    run()

    timeline.runTasks(scheduler.currentTime(), (t) => t.run())
  }
}

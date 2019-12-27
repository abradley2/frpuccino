# FRPuccinno

:warning: This is still in alpha development. I would love to get more people
testing this out and finding issues to be stamped out, but I wouldn't recommend
using this on any big projects that require a reliable view layer just yet! :warning:

FRPuccino is a small UI library built on the foundation of [Most.js](https://github.com/mostjs/core)

It's inspired heavily by [Elm](https://elm-lang.org/) and [Cycle.js](https://cycle.js.org/)

Here's a short "counter" example:
```
import { createElement, createApplication } from '@abradley2/frpuccino'

function update (model, addValue) {
  return model + addValue
}

function view () {
  return <div>
    <button onclick={1}>Clicked {value} times!</button>
  </div>
}

createApplication({
  mount: document.getElementById('app'),
  update,
  view,
  init: 0
}).run(0)
```

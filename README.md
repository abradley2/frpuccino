# StreamElement

An experiment in creating a `React.createElement`-like function that 
takes in JSX and outputs an element with an attached [Most.js](https://github.com/mostjs/core) event stream
that outputs mapped DOM events

For example:

**src/app.tsx**
```
import { createElement, StreamElement } from './lib/browser'

type Msg =
  | { type: 'BUTTON_CLICKED' }

function view (): StreamElement<Msg> {
  return <div>
    <button onclick={ () => ({ type: 'BUTTON_CLICKED' }) }>
      Click me!
    </button>
  </div>
}
```

Where `StreamElement` is:

```
import { Stream } from '@most/types'

export interface StreamElement<Msg> extends Element {
  eventStream: Stream<Msg>
}
```

This enables some cool stuff! With this we can create an application runtime
that loops the resulting event stream from the `view` into an `update` function, which feeds
that new model back into the `view` again, and so on and so forth.

Here's an actual working example you can try in **src/app.tsx**

```
/** @jsx createElement */
import { createApplication, createElement } from "./lib/browser";


function view (model) {
  return <button onclick={ () => ({type: 'CLICK'}) }>
    Clicked {model} times!
  </button>
}

function update (model, msg) {
  switch (msg.type) {
    case 'CLICK':
      return model + 1
    default:
      return model
  }
}

const node = document.getElementById('app')

createApplication(node, 0, update, view)
```

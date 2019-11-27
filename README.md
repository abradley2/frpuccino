# StreamElement

An experiment in creating a `React.createElement`-like function that 
takes in JSX and outputs an element with an attached Most.js event stream
that outputs mapped DOM events

For example:

*app.js*
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
/** @jsx createElement */
import { createElement, createApplication, mapElement } from '../lib/browser'

Object.assign(window, { createElement })

const init = 0

const update = (a, b) => a + b

const view = (value) => {
  const plusOne = <div>
    <button onclick={1}>Increase Value {value}</button>
  </div>

  const double = mapElement((v: number) => v * 2, plusOne)

  return <div>
    {plusOne}
    {double}
  </div>
}

const mount = document.createElement('div')
document.body.appendChild(mount)

createApplication({ mount, view, update, init }).run(0)


import { createApplication, createElement } from './lib/browser'

function view (model) {
  return createElement('div', {}, [
    createElement(
      'button',
      {
        onclick: () => ({ type: 'BUTTON_CLICKED' })
      },
      'clicked ' + (model.toString()) + ' times'
    )
  ])
}

function update (model, msg) {
  switch (msg.type) {
    case 'BUTTON_CLICKED':
      return model + 1

    default:
      return model
  }
}

createApplication(
  document.getElementById('app'),
  0,
  update,
  view
)

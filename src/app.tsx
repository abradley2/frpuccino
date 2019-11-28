/** @jsx createElement */
import { createApplication, createElement } from "./lib/browser";

interface Model {
  count: number;
  hideCounter: boolean;
  disableCounter: boolean;
  message: string;
}

const init: Model = {
  count: 0,
  disableCounter: true,
  hideCounter: false,
  message: ""
};

type Msg =
  | { type: "NOOP" }
  | { type: "DISABLE_COUNTER" }
  | { type: "BUTTON_CLICKED" }
  | { type: "HIDE_COUNTER" }
  | { type: "INPUT_CHANGED"; value: string };

function view (model: Model) {
  return (
    <div>
      <div>
        <button onclick={() => ({ type: "HIDE_COUNTER" })}>
          {model.hideCounter ? "show" : "hide"} counting button
        </button>
        <button onclick={() => ({ type: "DISABLE_COUNTER" })}>
          {model.disableCounter ? "Enable counter" : "Disable counter"}
        </button>
        {!model.hideCounter && (
          <button
            id="counter"
            onclick={
              model.disableCounter
                ? undefined
                : () => ({ type: "BUTTON_CLICKED" })
            }
          >
            Clicked {model.count} times!
          </button>
        )}
      </div>
      <div>
        <input
          value={model.message}
          oninput={e => {
            return {
              type: "INPUT_CHANGED",
              value: e.target.value
            };
          }}
        />
        <h3>{model.message}</h3>
      </div>
    </div>
  );
}

function update(model: Model, msg: Msg) {
  switch (msg.type) {
    case "BUTTON_CLICKED":
      return { ...model, count: model.count + 1 };

    case "INPUT_CHANGED":
      return { ...model, message: msg.value };

    case "HIDE_COUNTER":
      return { ...model, hideCounter: !model.hideCounter };

    case "DISABLE_COUNTER":
      return { ...model, disableCounter: !model.disableCounter };

    default:
      return model;
  }
}

const { run } = createApplication(
  document.getElementById("app"),
  init,
  update,
  view
);

run();

Object.assign(window, { createElement }); // why do I have to do this??

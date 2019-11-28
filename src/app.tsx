/** @jsx createElement */
import { createApplication, createElement } from "./lib/browser";

interface Model {
  count: number;
  hideCounter: boolean;
  disableCounter: boolean;
  message: string;
  alphaFocused: boolean;
  bravoFocused: boolean;
}

const init: Model = {
  count: 0,
  disableCounter: true,
  hideCounter: false,
  message: "",
  alphaFocused: false,
  bravoFocused: false
};

type Msg =
  | { type: "NOOP" }
  | { type: "DISABLE_COUNTER" }
  | { type: "BUTTON_CLICKED" }
  | { type: "HIDE_COUNTER" }
  | { type: "INPUT_CHANGED"; value: string }
  | { type: "TOGGLE_ALPHA_FOCUS"; value: boolean }
  | { type: "TOGGLE_BRAVO_FOCUS"; value: boolean };

function view(model: Model) {
  return (
    <div>
      <div>
        <button onclick={{ type: "HIDE_COUNTER" }}>
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
      <div>
        <input
          onfocus={() => ({ type: "TOGGLE_ALPHA_FOCUS", value: true })}
          onblur={() => ({ type: "TOGGLE_ALPHA_FOCUS", value: false })}
        />
        <div>{model.alphaFocused ? "FOCUSED" : "BLURRED"}</div>
      </div>
      <div>
        <input
          onfocus={() => ({ type: "TOGGLE_BRAVO_FOCUS", value: true })}
          onblur={() => ({ type: "TOGGLE_BRAVO_FOCUS", value: false })}
        />
        <div>{model.bravoFocused ? "FOCUSED" : "BLURRED"}</div>
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
    case "TOGGLE_ALPHA_FOCUS":
      return { ...model, alphaFocused: msg.value };
    case "TOGGLE_BRAVO_FOCUS":
      return { ...model, bravoFocused: msg.value };
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

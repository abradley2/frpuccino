/* eslint-disable */
export type OnEvent<Msg> = (e: Event) => Msg;

export type EventHandler<Msg> = Msg | OnEvent<Msg>;

export interface StreamAttributes<Msg> {
  onblur?: EventHandler<Msg>;
  onchange?: EventHandler<Msg>;
  oncontextmenu?: EventHandler<Msg>;
  onfocus?: EventHandler<Msg>;
  oninput?: EventHandler<Msg>;
  oninvalid?: EventHandler<Msg>;
  onreset?: EventHandler<Msg>;
  onsearch?: EventHandler<Msg>;
  onselect?: EventHandler<Msg>;
  onsubmit?: EventHandler<Msg>;
  // keyboard events
  onkeydown?: EventHandler<Msg>;
  onkeypress?: EventHandler<Msg>;
  onkeyup?: EventHandler<Msg>;
  // mouse events
  onclick?: EventHandler<Msg>;
  ondblclick?: EventHandler<Msg>;
  onmousedown?: EventHandler<Msg>;
  onmousemove?: EventHandler<Msg>;
  onmouseout?: EventHandler<Msg>;
  onmouseover?: EventHandler<Msg>;
  onmouseup?: EventHandler<Msg>;
  // animation
  onanimationend?: EventHandler<Msg>;
  onanimationstart?: EventHandler<Msg>;
  // drag events
  ondrag?: EventHandler<Msg>;
  ondragend?: EventHandler<Msg>;
  ondragenter?: EventHandler<Msg>;
  ondragexit?: EventHandler<Msg>;
  ondragleave?: EventHandler<Msg>;
  ondragover?: EventHandler<Msg>;
  ondragstop?: EventHandler<Msg>;
  ondrop?: EventHandler<Msg>;
}


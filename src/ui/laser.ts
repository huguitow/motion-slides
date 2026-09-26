/** Hides the remote dot when the presenter stops moving, so it never stays frozen on screen. */
const REMOTE_IDLE_MS = 2000;

export interface LaserPointerOptions {
  /** Element the mouse moves over (the shield above the slides). */
  readonly surface: HTMLElement;
  /** Positioned element the dot is drawn in. */
  readonly layer: HTMLElement;
  /** Called with the pointer's client coordinates while the laser shows, then null when it hides. */
  readonly onPoint?: (point: { readonly clientX: number; readonly clientY: number } | null) => void;
}

export interface LaserPointer {
  /** Turns laser mode on or off (L). Returns the new mode. */
  toggle(): boolean;
  destroy(): void;
}

/** A glowing dot that replaces the cursor while laser mode is on or Ctrl is held, like PowerPoint. */
export function createLaserPointer(options: LaserPointerOptions): LaserPointer {
  const { surface, layer, onPoint } = options;
  const dot = createDot(layer);
  let mode = false;
  let ctrlHeld = false;
  let pointer: { clientX: number; clientY: number } | null = null;

  const render = () => {
    const active = mode || ctrlHeld;
    layer.classList.toggle('is-lasering', active);
    const point = active ? pointer : null;
    if (point) placeDot(dot, layer, point.clientX, point.clientY);
    dot.hidden = point === null;
    onPoint?.(point);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    pointer = { clientX: event.clientX, clientY: event.clientY };
    if (mode || ctrlHeld) render();
  };
  const onLeave = () => {
    pointer = null;
    render();
  };
  const setCtrl = (held: boolean) => {
    if (held === ctrlHeld) return;
    ctrlHeld = held;
    render();
  };
  const onKeyDown = (event: KeyboardEvent) => event.key === 'Control' && setCtrl(true);
  const onKeyUp = (event: KeyboardEvent) => event.key === 'Control' && setCtrl(false);
  // A Ctrl released in another window never sends keyup here.
  const onBlur = () => setCtrl(false);

  surface.addEventListener('pointermove', onMove);
  surface.addEventListener('pointerleave', onLeave);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    toggle() {
      mode = !mode;
      render();
      return mode;
    },
    destroy() {
      surface.removeEventListener('pointermove', onMove);
      surface.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      dot.remove();
    },
  };
}

export interface RemoteDot {
  /** Shows the dot at layer pixel coordinates, or hides it with null. */
  show(point: { readonly x: number; readonly y: number } | null): void;
  destroy(): void;
}

/** The dot driven from the presenter window. */
export function createRemoteDot(layer: HTMLElement): RemoteDot {
  const dot = createDot(layer);
  let timer = 0;
  return {
    show(point) {
      window.clearTimeout(timer);
      dot.hidden = point === null;
      if (!point) return;
      dot.style.transform = `translate(${point.x}px, ${point.y}px)`;
      timer = window.setTimeout(() => (dot.hidden = true), REMOTE_IDLE_MS);
    },
    destroy() {
      window.clearTimeout(timer);
      dot.remove();
    },
  };
}

function createDot(layer: HTMLElement): HTMLElement {
  const dot = document.createElement('div');
  dot.className = 'laser-dot';
  dot.hidden = true;
  dot.setAttribute('aria-hidden', 'true');
  layer.append(dot);
  return dot;
}

function placeDot(dot: HTMLElement, layer: HTMLElement, clientX: number, clientY: number): void {
  const rect = layer.getBoundingClientRect();
  dot.style.transform = `translate(${clientX - rect.left}px, ${clientY - rect.top}px)`;
}

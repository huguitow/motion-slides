/** Messages the player sends to the slide iframe. */
export type PlayerMessage =
  | { readonly type: 'deck:enter'; readonly step: number }
  | { readonly type: 'deck:step'; readonly step: number }
  | { readonly type: 'deck:leave' };

export interface RuntimeMeta {
  readonly slideIndex: number;
  readonly slideCount: number;
  readonly steps: number;
}

/**
 * Runs inside each slide iframe and exposes `window.deck` to slide scripts.
 * It is serialized with `toString()`, so it must stay self-contained: no imports, no outer variables.
 */
export function slideRuntime(meta: RuntimeMeta): void {
  type StepDirection = 'enter' | 'forward' | 'backward';
  const root = document.documentElement;
  const enterFns: Array<() => void> = [];
  const stepFns: Array<(step: number, direction: StepDirection) => void> = [];
  const leaveFns: Array<() => void> = [];
  let step = Number(root.dataset.step) || 0;
  let entered = false;

  const run = (fn: () => void) => {
    try {
      fn();
    } catch (error) {
      console.error('[deck] erreur dans un script de slide :', error);
    }
  };
  const setStep = (value: number) => {
    step = value;
    root.dataset.step = String(value);
  };
  const emitStep = (direction: StepDirection) => stepFns.forEach((fn) => run(() => fn(step, direction)));
  const isValidStep = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) <= meta.steps;

  const api = {
    slideIndex: meta.slideIndex,
    slideCount: meta.slideCount,
    steps: meta.steps,
    get step() {
      return step;
    },
    onEnter(fn: () => void) {
      enterFns.push(fn);
      if (entered) run(fn);
    },
    onStep(fn: (step: number, direction: StepDirection) => void) {
      stepFns.push(fn);
      if (entered) run(() => fn(step, 'enter'));
    },
    onLeave(fn: () => void) {
      leaveFns.push(fn);
    },
  };
  Object.defineProperty(window, 'deck', { value: api, enumerable: true, configurable: true });

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const message = event.data as { type?: unknown; step?: unknown } | null;
    if (!message || typeof message !== 'object') return;

    if (message.type === 'deck:enter' && isValidStep(message.step)) {
      setStep(message.step);
      entered = true;
      root.classList.add('deck-entered');
      enterFns.forEach(run);
      emitStep('enter');
    } else if (message.type === 'deck:step' && entered && isValidStep(message.step)) {
      const direction = message.step >= step ? 'forward' : 'backward';
      setStep(message.step);
      emitStep(direction);
    } else if (message.type === 'deck:leave') {
      leaveFns.forEach(run);
    }
  });
}

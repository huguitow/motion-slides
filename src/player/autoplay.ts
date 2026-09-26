import { AUTOPLAY_SECONDS, DEFAULT_AUTOPLAY_SECONDS, nextAutoplaySeconds } from '../deck/autoplay';

const STORAGE_KEY = 'motion-slides:autoplay-seconds';

export interface AutoplayOptions {
  /** Thin bar filling up until the next build. */
  readonly bar: HTMLElement;
  /** Time the current build stays on screen. */
  readonly durationMs: () => number;
  readonly onAdvance: () => void;
  /** Called with the pace when auto-advance starts or its pace changes, and null when it stops. */
  readonly onChange: (seconds: number | null) => void;
}

export interface Autoplay {
  isRunning(): boolean;
  seconds(): number;
  toggle(): void;
  start(): void;
  /** Next pace in AUTOPLAY_SECONDS, remembered in this browser. */
  cycleSeconds(): number;
  /** Starts the countdown over, after any move. */
  restart(): void;
  /** Holds the countdown while something covers the slide (blank screen, overview, panels). */
  setPaused(paused: boolean): void;
  destroy(): void;
}

/** Advances by itself, one build at a time, like pressing Space at regular intervals. */
export function createAutoplay(options: AutoplayOptions): Autoplay {
  let running = false;
  let paused = false;
  let seconds = readSeconds();
  let timer = 0;
  // Countdown of the current build: its total length, and what is left of it when paused.
  let totalMs = 0;
  let remainingMs = 0;
  let deadline = 0;

  const showProgress = (fromFraction: number, durationMs: number) => {
    const { bar } = options;
    bar.style.transition = 'none';
    bar.style.transform = `scaleX(${fromFraction})`;
    // Reading the layout commits the start value, so the transition below animates from it.
    void bar.offsetWidth;
    if (durationMs > 0) {
      bar.style.transition = `transform ${durationMs}ms linear`;
      bar.style.transform = 'scaleX(1)';
    }
  };

  const schedule = (durationMs: number) => {
    window.clearTimeout(timer);
    remainingMs = durationMs;
    deadline = performance.now() + durationMs;
    showProgress(totalMs > 0 ? 1 - durationMs / totalMs : 0, durationMs);
    timer = window.setTimeout(options.onAdvance, durationMs);
  };

  const begin = () => {
    totalMs = options.durationMs();
    if (paused) {
      remainingMs = totalMs;
      showProgress(0, 0);
    } else {
      schedule(totalMs);
    }
  };

  const setRunning = (value: boolean) => {
    running = value;
    options.bar.parentElement?.classList.toggle('is-running', value);
    window.clearTimeout(timer);
    if (value) begin();
    options.onChange(value ? seconds : null);
  };

  return {
    isRunning: () => running,
    seconds: () => seconds,
    toggle: () => setRunning(!running),
    start: () => setRunning(true),
    cycleSeconds() {
      seconds = nextAutoplaySeconds(seconds);
      writeSeconds(seconds);
      if (running) {
        begin();
        options.onChange(seconds);
      }
      return seconds;
    },
    restart() {
      if (running) begin();
    },
    setPaused(value) {
      if (value === paused) return;
      paused = value;
      if (!running) return;
      if (paused) {
        window.clearTimeout(timer);
        remainingMs = Math.max(0, deadline - performance.now());
        showProgress(totalMs > 0 ? 1 - remainingMs / totalMs : 0, 0);
      } else {
        schedule(remainingMs);
      }
    },
    destroy: () => window.clearTimeout(timer),
  };
}

/** A per-viewer preference: unreadable storage (private window…) just means the default pace. */
function readSeconds(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return AUTOPLAY_SECONDS.find((seconds) => seconds === stored) ?? DEFAULT_AUTOPLAY_SECONDS;
  } catch {
    return DEFAULT_AUTOPLAY_SECONDS;
  }
}

function writeSeconds(seconds: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(seconds));
  } catch {
    // Not remembered next time; nothing else depends on it.
  }
}

export interface Timer {
  /** Starts counting the first time it is called; later calls do nothing. */
  start(): void;
  /** Pauses or resumes. */
  toggle(): void;
  reset(): void;
  isRunning(): boolean;
  elapsedMs(): number;
  format(): string;
}

/** Talk timer for the presenter view. `now` is injectable for tests. */
export function createTimer(now: () => number = () => performance.now()): Timer {
  let started = false;
  let runningSince: number | null = null;
  let accumulated = 0;

  const elapsedMs = () => accumulated + (runningSince === null ? 0 : now() - runningSince);

  return {
    start() {
      if (started) return;
      started = true;
      runningSince = now();
    },
    toggle() {
      if (runningSince === null) {
        started = true;
        runningSince = now();
      } else {
        accumulated = elapsedMs();
        runningSince = null;
      }
    },
    reset() {
      accumulated = 0;
      if (runningSince !== null) runningSince = now();
    },
    isRunning: () => runningSince !== null,
    elapsedMs,
    format: () => formatDuration(elapsedMs()),
  };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

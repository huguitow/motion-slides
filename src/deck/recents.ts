import { carryPosition, first, type Position } from './navigation';

export const MAX_RECENTS = 8;

/** A deck opened from a file, remembered in this browser only. */
export interface RecentDeck {
  /** File name, which identifies the entry: a new version of the same file replaces it. */
  readonly name: string;
  readonly title: string;
  /** Text of the file when it was last opened, to reopen it even when the file is unreachable. */
  readonly source: string;
  readonly slideCount: number;
  /** Epoch milliseconds. */
  readonly openedAt: number;
  /** Where the presentation was left. */
  readonly position: Position;
  /** Chromium only: lets a resumed deck read the latest version of the file and watch it again. */
  readonly handle?: FileSystemFileHandle;
}

/** Newest first, one entry per file name, at most MAX_RECENTS. */
export function upsertRecent(list: readonly RecentDeck[], entry: RecentDeck): RecentDeck[] {
  return [entry, ...list.filter((deck) => deck.name !== entry.name)].slice(0, MAX_RECENTS);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(elapsedMs: number): string {
  if (elapsedMs < MINUTE) return 'à l’instant';
  if (elapsedMs < HOUR) return `il y a ${Math.floor(elapsedMs / MINUTE)} min`;
  if (elapsedMs < DAY) return `il y a ${Math.floor(elapsedMs / HOUR)} h`;
  if (elapsedMs < 2 * DAY) return 'hier';
  return `il y a ${Math.floor(elapsedMs / DAY)} jours`;
}

/** Where to start a resumed deck, which may have changed since its position was saved. */
export function resumePosition(saved: Position | undefined, steps: readonly number[]): Position {
  return saved ? carryPosition(saved, steps) : first();
}

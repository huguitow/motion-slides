/** The part of a FileSystemFileHandle the watcher needs. */
export interface WatchedFile {
  getFile(): Promise<File>;
}

export interface FileWatchOptions {
  /** Called with the new text once the file has changed and stopped moving. */
  readonly onChange: (text: string) => void;
  /** Called once when the file stays unreadable (deleted, permission revoked); watching then stops. */
  readonly onLost: () => void;
  readonly intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 500;
/** Editors may delete then recreate a file when saving: a few failed reads in a row are tolerated. */
const MAX_FAILED_READS = 4;

/**
 * Polls a local file and reports new versions. A change is only reported when two polls in a row
 * see the same version, so a file that Claude is still writing is never read half-way.
 * Returns a function that stops watching.
 */
export function watchFile(handle: WatchedFile, options: FileWatchOptions): () => void {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  let stopped = false;
  let timer = 0;
  let known: string | null = null;
  let candidate: string | null = null;
  let failures = 0;

  const poll = async () => {
    try {
      const file = await handle.getFile();
      if (stopped) return;
      const version = `${file.lastModified}:${file.size}`;
      if (known === null) {
        known = version;
      } else if (version === known) {
        candidate = null;
      } else if (version !== candidate) {
        candidate = version;
      } else {
        const text = await file.text();
        if (stopped) return;
        known = version;
        candidate = null;
        options.onChange(text);
      }
      // Only a complete cycle counts as a success: content can fail to read even when metadata does not.
      failures = 0;
    } catch {
      if (stopped) return;
      failures++;
      if (failures >= MAX_FAILED_READS) {
        stopped = true;
        options.onLost();
        return;
      }
    }
    // A new poll only starts once the previous one is done, so slow reads never overlap.
    timer = window.setTimeout(() => void poll(), intervalMs);
  };

  void poll();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
}

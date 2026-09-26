/**
 * File System Access API helpers (Chromium only). A file handle lets the player re-read the deck
 * when it changes on disk; other browsers fall back to a plain one-off read.
 */

interface OpenFilePickerOptions {
  readonly types: readonly { readonly description: string; readonly accept: Record<string, readonly string[]> }[];
}

type WindowWithPicker = Window & {
  showOpenFilePicker?: (options: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
};

type ItemWithHandle = DataTransferItem & {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
};

const PICKER_OPTIONS: OpenFilePickerOptions = {
  types: [{ description: 'Deck Motion Slides', accept: { 'text/html': ['.html', '.htm'] } }],
};

export function canPickFileHandles(): boolean {
  return typeof (window as WindowWithPicker).showOpenFilePicker === 'function';
}

/** Opens the system picker. Resolves to null when the user cancels. */
export async function pickFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await (window as WindowWithPicker).showOpenFilePicker!(PICKER_OPTIONS);
    return handle ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

/**
 * Handle of the first dropped file, or null when the browser cannot give one.
 * Must be called synchronously inside the drop handler: the items are cleared right after.
 */
export function droppedFileHandle(event: DragEvent): Promise<FileSystemFileHandle | null> {
  const item = event.dataTransfer?.items[0] as ItemWithHandle | undefined;
  if (item?.kind !== 'file' || typeof item.getAsFileSystemHandle !== 'function') return Promise.resolve(null);
  return item
    .getAsFileSystemHandle()
    .then((handle) => (handle?.kind === 'file' ? (handle as FileSystemFileHandle) : null))
    .catch(() => null);
}

const MAX_DIGITS = 3;

export interface JumpResult {
  /** Digits typed so far, shown to the presenter. */
  readonly buffer: string;
  /** True when the key belongs to the jump and must not trigger its usual action. */
  readonly handled: boolean;
  /** Zero-based slide index to jump to, set when Enter confirms a number. */
  readonly target?: number;
}

/** Typing a slide number then Enter jumps to it, like PowerPoint's slide show. */
export function jumpInput(buffer: string, key: string): JumpResult {
  if (/^[0-9]$/.test(key)) {
    return { buffer: buffer.length < MAX_DIGITS ? buffer + key : buffer, handled: true };
  }
  if (buffer === '') {
    return { buffer: '', handled: false };
  }
  if (key === 'Enter') {
    return { buffer: '', handled: true, target: Math.max(Number(buffer) - 1, 0) };
  }
  return { buffer: '', handled: key === 'Escape' || key === 'Backspace' };
}

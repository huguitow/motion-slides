/** Where the presentation is: which slide, and how many of its builds have played. */
export interface Position {
  readonly slide: number;
  readonly step: number;
}

/** `steps[i]` is the number of on-click builds of slide i. Functions return the same object when nothing moves. */
export function next(position: Position, steps: readonly number[]): Position {
  if (position.step < steps[position.slide]) {
    return { slide: position.slide, step: position.step + 1 };
  }
  if (position.slide < steps.length - 1) {
    return { slide: position.slide + 1, step: 0 };
  }
  return position;
}

export function prev(position: Position, steps: readonly number[]): Position {
  if (position.step > 0) {
    return { slide: position.slide, step: position.step - 1 };
  }
  if (position.slide > 0) {
    const slide = position.slide - 1;
    return { slide, step: steps[slide] };
  }
  return position;
}

export function first(): Position {
  return { slide: 0, step: 0 };
}

export function last(steps: readonly number[]): Position {
  const slide = steps.length - 1;
  return { slide, step: steps[slide] };
}

export function goTo(slide: number, steps: readonly number[]): Position {
  return { slide: Math.min(Math.max(slide, 0), steps.length - 1), step: 0 };
}

/** Keeps `position` in a reloaded deck whose slides may have changed, clamping what no longer exists. */
export function carryPosition(position: Position, steps: readonly number[]): Position {
  if (position.slide >= steps.length) return last(steps);
  return { slide: position.slide, step: Math.min(position.step, steps[position.slide]) };
}

import { STAGE_HEIGHT, STAGE_WIDTH } from './types';

export interface StageFit {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/** Largest scale at which the 16:9 stage fits the viewport, centered with black bars. */
export function fitStage(viewportWidth: number, viewportHeight: number): StageFit {
  const scale = Math.max(0, Math.min(viewportWidth / STAGE_WIDTH, viewportHeight / STAGE_HEIGHT));
  return {
    scale,
    offsetX: (viewportWidth - STAGE_WIDTH * scale) / 2,
    offsetY: (viewportHeight - STAGE_HEIGHT * scale) / 2,
  };
}

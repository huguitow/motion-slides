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

/** A position on the stage, from 0 to 1 on each axis, so it means the same thing on any screen. */
export interface StagePoint {
  readonly x: number;
  readonly y: number;
}

/** Where a point of the viewport falls on the stage, or null in the black bars around it. */
export function stagePoint(x: number, y: number, viewportWidth: number, viewportHeight: number): StagePoint | null {
  const { scale, offsetX, offsetY } = fitStage(viewportWidth, viewportHeight);
  if (scale === 0) return null;
  const point = { x: (x - offsetX) / (STAGE_WIDTH * scale), y: (y - offsetY) / (STAGE_HEIGHT * scale) };
  const inside = point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
  return inside ? point : null;
}

/** The viewport pixel showing a stage position. */
export function viewportPoint(point: StagePoint, viewportWidth: number, viewportHeight: number): StagePoint {
  const { scale, offsetX, offsetY } = fitStage(viewportWidth, viewportHeight);
  return { x: offsetX + point.x * STAGE_WIDTH * scale, y: offsetY + point.y * STAGE_HEIGHT * scale };
}

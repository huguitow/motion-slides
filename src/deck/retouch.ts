export interface RetouchInput {
  readonly fileName: string;
  /** Zero-based index of the slide to change. */
  readonly slideIndex: number;
  readonly slideCount: number;
  /** Build on screen when the request was written, and the slide's number of builds. */
  readonly step: number;
  readonly steps: number;
  /** What the author wants changed, in their own words. */
  readonly instruction: string;
  /** The slide's `<template data-slide>` markup. */
  readonly slideSource: string;
}

/** Ready-to-paste request asking Claude to change one slide and keep the rest of the deck. */
export function buildRetouchRequest(input: RetouchInput): string {
  const where = `la slide ${input.slideIndex + 1} sur ${input.slideCount}`;
  const build = input.steps > 0 ? ` (j'étais à l'étape ${input.step} sur ${input.steps})` : '';
  return [
    `Dans le fichier « ${input.fileName} », modifie ${where}${build} :`,
    '',
    input.instruction.trim(),
    '',
    'Ne modifie pas les autres slides et respecte le format .deck.html.',
    'Si tu as accès au fichier, modifie-le directement ; sinon, renvoie le fichier .deck.html complet.',
    '',
    'Code actuel de cette slide :',
    '```html',
    input.slideSource,
    '```',
  ].join('\n');
}

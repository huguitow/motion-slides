import { describe, expect, test } from 'vitest';
import { buildRetouchRequest, type RetouchInput } from './retouch';

const input: RetouchInput = {
  fileName: 'eiffel.deck.html',
  slideIndex: 2,
  slideCount: 7,
  step: 1,
  steps: 3,
  instruction: '  Rends le graphique plus grand.  ',
  slideSource: '<template data-slide><h1>Hauteur</h1></template>',
};

describe('buildRetouchRequest', () => {
  test('names the file and the slide with its position in the deck', () => {
    const request = buildRetouchRequest(input);

    expect(request).toContain('« eiffel.deck.html »');
    expect(request).toContain('slide 3 sur 7');
  });

  test('includes the trimmed instruction and the slide code in an html block', () => {
    const request = buildRetouchRequest(input);

    expect(request).toContain('\nRends le graphique plus grand.\n');
    expect(request).toContain('```html\n<template data-slide><h1>Hauteur</h1></template>\n```');
  });

  test('mentions the build on screen only when the slide has builds', () => {
    expect(buildRetouchRequest(input)).toContain('étape 1 sur 3');
    expect(buildRetouchRequest({ ...input, step: 0, steps: 0 })).not.toContain('étape');
  });

  test('asks to keep the rest of the deck and to edit the file in place when possible', () => {
    const request = buildRetouchRequest(input);

    expect(request).toContain('Ne modifie pas les autres slides');
    expect(request).toMatch(/modifie-le directement/);
    expect(request).toMatch(/renvoie le fichier \.deck\.html complet/);
  });
});

import { describe, expect, test } from 'vitest';
import { buildPrompt } from './prompt';

const BASE = 'Tu vas créer une présentation.\n\nVoici le sujet de la présentation :\n\n';

describe('buildPrompt', () => {
  test('appends the topic after the prompt, separated by a blank line', () => {
    expect(buildPrompt(BASE, 'La tour Eiffel')).toBe(
      'Tu vas créer une présentation.\n\nVoici le sujet de la présentation :\n\nLa tour Eiffel',
    );
  });

  test('trims the topic but keeps its inner line breaks', () => {
    expect(buildPrompt(BASE, '  La tour Eiffel\npour une classe de 3e  \n')).toBe(
      'Tu vas créer une présentation.\n\nVoici le sujet de la présentation :\n\nLa tour Eiffel\npour une classe de 3e',
    );
  });

  test('returns the prompt unchanged when no topic is given', () => {
    expect(buildPrompt(BASE, '')).toBe(BASE);
    expect(buildPrompt(BASE, '   \n ')).toBe(BASE);
  });

  test('does not depend on how many blank lines end the base prompt', () => {
    expect(buildPrompt('Sujet :', 'Volcans')).toBe('Sujet :\n\nVolcans');
    expect(buildPrompt('Sujet :\n\n\n\n', 'Volcans')).toBe('Sujet :\n\nVolcans');
  });
});

/**
 * The prompt copied for Claude: the base prompt (which ends with "Voici le sujet de la présentation :")
 * followed by the topic the user typed. Without a topic, the base prompt is returned unchanged.
 */
export function buildPrompt(basePrompt: string, topic: string): string {
  const cleanTopic = topic.trim();
  if (cleanTopic === '') return basePrompt;
  return `${basePrompt.trimEnd()}\n\n${cleanTopic}`;
}

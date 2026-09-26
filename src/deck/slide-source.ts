/** Markup of the `index`-th `<template data-slide>` of a .deck.html source, notes included, or null. */
export function slideSource(source: string, index: number): string | null {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const template = doc.querySelectorAll<HTMLTemplateElement>('template[data-slide]')[index];
  return template?.outerHTML ?? null;
}

/** Stroke icons drawn on a 20×20 grid, sized by CSS and coloured with currentColor. */
const icon = (paths: string) =>
  `<svg class="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  prev: icon('<path d="M12.5 4.5 7 10l5.5 5.5"/>'),
  next: icon('<path d="M7.5 4.5 13 10l-5.5 5.5"/>'),
  overview: icon('<rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1"/>'),
  presenter: icon('<rect x="2.5" y="4" width="15" height="10" rx="1.5"/><path d="M10 14v3M6.5 17h7M6 7.5h5M6 10h3"/>'),
  pdf: icon('<path d="M5.5 7V3h9v4"/><rect x="3" y="7" width="14" height="7" rx="1.5"/><path d="M5.5 12h9v5h-9z"/>'),
  fullscreen: icon('<path d="M3 7.5V3h4.5M17 7.5V3h-4.5M3 12.5V17h4.5M17 12.5V17h-4.5"/>'),
  download: icon('<path d="M10 3v9.5M6 8.5l4 4 4-4"/><path d="M3.5 13.5v2A1.5 1.5 0 0 0 5 17h10a1.5 1.5 0 0 0 1.5-1.5v-2"/>'),
  retouch: icon('<path d="M13.5 3.5l3 3L7 16H4v-3z"/><path d="M11.5 5.5l3 3"/>'),
  close: icon('<path d="M5 5l10 10M15 5 5 15"/>'),
  warning: icon('<path d="M10 3 2.5 16.5h15z"/><path d="M10 8.5v3.5M10 14.5v.01"/>'),
  copy: icon('<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7"/>'),
  check: icon('<path d="m4 10.5 4 4 8-9"/>'),
  open: icon('<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3.5l2 2h5.5A1.5 1.5 0 0 1 17 8.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>'),
  play: icon('<path d="M6.5 4.5v11l9-5.5z" fill="currentColor" stroke="none"/>'),
  external: icon('<path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v10A1.5 1.5 0 0 0 4.5 17h10a1.5 1.5 0 0 0 1.5-1.5V12M11 3h6v6M17 3l-8 8"/>'),
  github: '<svg class="icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
} as const;

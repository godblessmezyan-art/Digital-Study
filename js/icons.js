/**
 * 线性图标库（stroke 风格，颜色跟随 currentColor）
 */
const S = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';

export const icons = {
  home: `<svg viewBox="0 0 24 24" ${S}><path d="M3.5 10.8 12 3.8l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.8 20v-5.4h4.4V20"/></svg>`,

  bookshelf: `<svg viewBox="0 0 24 24" ${S}><path d="M4 4h4v16H4z"/><path d="M8 6h4v14H8z"/><path d="m13.2 6.6 3.9-1 3.4 13.7-3.9 1z"/></svg>`,

  clock: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,

  chart: `<svg viewBox="0 0 24 24" ${S}><path d="M4.5 19.5V13"/><path d="M9.8 19.5V7"/><path d="M15.1 19.5v-8.5"/><path d="M20 19.5V4.5"/></svg>`,

  note: `<svg viewBox="0 0 24 24" ${S}><path d="M5 4.5h11l3 3V19.5H5z"/><path d="M8.5 10h7M8.5 14h5"/></svg>`,

  star: `<svg viewBox="0 0 24 24" ${S}><path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8z"/></svg>`,

  folder: `<svg viewBox="0 0 24 24" ${S}><path d="M3.5 6.5h6l2 2.5h9v10h-17z"/></svg>`,

  sliders: `<svg viewBox="0 0 24 24" ${S}><path d="M4 8h9M17 8h3"/><circle cx="15" cy="8" r="2"/><path d="M4 16h3M11 16h9"/><circle cx="9" cy="16" r="2"/></svg>`,

  search: `<svg viewBox="0 0 24 24" ${S}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/></svg>`,

  bookmark: `<svg viewBox="0 0 24 24" ${S}><path d="M7 4h10v16l-5-3.6L7 20z"/></svg>`,

  calendar: `<svg viewBox="0 0 24 24" ${S}><rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>`,

  flame: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3.8s1 2.7 3.3 5.1c1.8 1.9 2.4 3.6 2.4 5.3a5.7 5.7 0 0 1-11.4 0c0-1.3.4-2.6 1.3-3.9.6 1 1.3 1.6 2.2 2 .1-3 1-6 2.2-8.5z"/></svg>`,

  leaf: `<svg viewBox="0 0 24 24" ${S}><path d="M19.5 5.5c-8.5 0-13.5 3.5-13.5 9a5.5 5.5 0 0 0 5.5 5.5c5.5 0 8-6.5 8-14.5z"/><path d="M5 20c2-5.5 6-9.5 10.5-11.5"/></svg>`,

  feather: `<svg viewBox="0 0 24 24" ${S}><path d="M19.8 4.2c-5.5.3-10.3 3.2-11.9 8.4-.8 2.5-.6 5-.3 6.6 1.7.2 4.2.4 6.6-.5 5-1.8 6.3-8.7 5.6-14.5z"/><path d="M4.5 19.5 15 9"/></svg>`,

  heart: `<svg viewBox="0 0 24 24" ${S}><path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10z"/></svg>`,

  bulb: `<svg viewBox="0 0 24 24" ${S}><path d="M9.5 18a6 6 0 1 1 5 0c-.7.5-1 1.1-1 2h-3c0-.9-.3-1.5-1-2z"/><path d="M10.2 21.5h3.6"/></svg>`,

  briefcase: `<svg viewBox="0 0 24 24" ${S}><rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5"/><path d="M3.5 12.5h17"/></svg>`,

  rocket: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3.5c3.5 1.5 5 5 5 8.5l-2.5 2.5h-5L7 12c0-3.5 1.5-7 5-8.5z"/><path d="M9.5 14.5 7 19l3-1 2 2 2-2 3 1-2.5-4.5"/><circle cx="12" cy="9.5" r="1.4"/></svg>`,

  grid: `<svg viewBox="0 0 24 24" ${S}><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>`,
};

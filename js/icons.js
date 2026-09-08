/** 云天幻境 · 黄铜雕刻 SVG 图标系统 */
const S = 'fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"';
const svg = (body, extra = '') => `<svg viewBox="0 0 24 24" ${S} aria-hidden="true" ${extra}>${body}</svg>`;

export const icons = {
  tower: svg('<path d="M5 20h14M7 20V9l2-2 1 2 2-5 2 5 1-2 2 2v11"/><path d="M10 20v-5h4v5M8 12h2m4 0h2M12 4V2m-1 1h2"/>'),
  tome: svg('<path d="M4 5.5C6.8 4.7 9.5 5 12 7v13c-2.5-2-5.2-2.3-8-1.5zM20 5.5c-2.8-.8-5.5-.5-8 1.5v13c2.5-2 5.2-2.3 8-1.5z"/><path d="M7 8.5c1-.1 2 .2 3 .8m-3 2.2c1-.1 2 .2 3 .8m7-3.8c-1-.1-2 .2-3 .8"/><path d="M3 7v13c3.4-1 6.3-.5 9 2 2.7-2.5 5.6-3 9-2V7"/>'),
  astrolabe: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M6.3 6.3l2.1 2.1m7.2 7.2 2.1 2.1m0-11.4-2.1 2.1m-7.2 7.2-2.1 2.1"/><path d="m12 6 2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/>'),
  quill: svg('<path d="M20 3C13 3 7 7.2 7 14.3c0 1.4.4 2.6 1.2 3.7C15 16.5 19.2 11.2 20 3z"/><path d="M4 21c3-6 7.1-10.4 12.2-13.7M5.5 18.2H11"/><path d="M15.5 6.4v4.3h3.1"/>'),
  scroll: svg('<path d="M7 5h11v13.5A2.5 2.5 0 0 1 15.5 21H6a3 3 0 0 1 0-6h11"/><path d="M7 15V4a2 2 0 0 0-4 0v2h4m3 3h5m-5 3h4"/><path d="m17 5 1.5-1.5L20 5l-1.5 1.5z"/>'),
  hourglass: svg('<path d="M6 3h12M6 21h12M8 3c0 4 1.5 6.7 4 9-2.5 2.3-4 5-4 9m8-18c0 4-1.5 6.7-4 9 2.5 2.3 4 5 4 9"/><path d="m9 18 3-3 3 3M12 9v3"/><path d="M4 7h2m12 0h2"/>'),
  alchemy: svg('<circle cx="12" cy="12" r="3"/><path d="M19 14.5l1.5 1-2 3.5-1.8-.8a8 8 0 0 1-2.2 1.3l-.2 2h-4l-.3-2a8 8 0 0 1-2.2-1.3L6 19l-2-3.5 1.5-1a8 8 0 0 1 0-2.5L4 11l2-3.5 1.8.8A8 8 0 0 1 10 7l.3-2h4l.2 2a8 8 0 0 1 2.2 1.3l1.8-.8 2 3.5-1.5 1a8 8 0 0 1 0 2.5z"/><path d="m12 9 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>'),
  search: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.3 15.3 4.7 4.7M19 4v3m-1.5-1.5h3M5 18v2m-1-1h2"/>'),
  bell: svg('<path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5zM10 20h4"/><path d="M12 3V1m-2.5 1h5M4 9l-1 1m17-1 1 1"/>'),
  telescope: svg('<path d="m4 14 11-6 2 3-11 6z"/><path d="m15 8 2.5-1.4 2 3.5L17 11.5M8 16l4 6m2-8-2 8M9.5 15l3.5-1.9"/><path d="M3 13.5 5.2 17M18.5 5.5l1-1m1.5 3 1-.2"/>'),
  return: svg('<path d="M9 7 4 12l5 5M5 12h9a5 5 0 0 1 5 5v1"/><path d="M15 4h4v4"/>'),
  sigil: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.15" aria-hidden="true"><circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="5"/><path d="M32 2v60M2 32h60M11 11l42 42m0-42L11 53M32 12l6.2 13.8L52 32l-13.8 6.2L32 52l-6.2-13.8L12 32l13.8-6.2z"/><path d="M28 2h8M28 62h8M2 28v8M62 28v8"/><circle cx="32" cy="32" r="27" stroke-dasharray="1 5"/></svg>`,
};

// 语义别名让现有组件保持稳定，新主题可替换映射而不改组件。
Object.assign(icons, {
  home: icons.tower,
  bookshelf: icons.tome,
  grid: icons.astrolabe,
  note: icons.quill,
  feather: icons.scroll,
  clock: icons.hourglass,
  settings: icons.alchemy,
  compass: icons.astrolabe,
});

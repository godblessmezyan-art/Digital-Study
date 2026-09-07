/**
 * 主题注册表：页面组件只消费这些令牌。
 * 新主题只需增加一份配置与对应素材，不需要重写组件。
 */
export const THEMES = {
  'cloud-realm': {
    id: 'cloud-realm',
    name: '云天幻境',
    englishName: 'Cloud Realm Archive',
    welcomeEyebrow: '欢迎来到',
    welcomeTitle: '云天幻境',
    subtitle: '在云海之上，遇见更大的世界',
    background: 'assets/cloud-realm-study-v2.png',
    colors: {
      primary: '#173653',
      accent: '#b98b4d',
      panel: 'rgba(255, 252, 245, .88)',
      text: '#15273a',
    },
    backgroundFocus: {
      desktop: 'center 48%',
      tablet: '54% 48%',
      mobile: '52% 45%',
    },
    logo: 'sigil',
    decorations: ['astrolabe', 'telescope', 'ivy', 'lantern'],
    dailyBookmarkSource: 'dailyBookmarks',
    categoryArtwork: 'assets/cloud-realm-study-v2.png',
    atmosphere: 'day',
  },
};

const KEY = 'library-theme';

export function applyTheme(id = 'cloud-realm') {
  const theme = THEMES[id] || THEMES['cloud-realm'];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.atmosphere = theme.atmosphere;
  root.style.setProperty('--navy', theme.colors.primary);
  root.style.setProperty('--gold', theme.colors.accent);
  root.style.setProperty('--glass', theme.colors.panel);
  root.style.setProperty('--ink', theme.colors.text);
  root.style.setProperty('--scene-position', theme.backgroundFocus.desktop);
  root.style.setProperty('--scene-position-mobile', theme.backgroundFocus.mobile);
  root.style.setProperty('--scene-position-tablet', theme.backgroundFocus.tablet || theme.backgroundFocus.desktop);
  document.querySelector('.world__art')?.setAttribute('src', theme.background);
  localStorage.setItem(KEY, theme.id);
  return theme;
}

export function initTheme() {
  return applyTheme(localStorage.getItem(KEY) || 'cloud-realm');
}

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
    defaultScene: 'sky-study',
    scenes: [
      {
        id: 'sky-study',
        code: 'CR-01',
        name: '云端书房',
        region: '藏书塔 · 东侧观景窗',
        description: '越过黄铜仪器与摊开的书页，眺望天空主城。',
        image: 'assets/cloud-realm-study-v2.png',
        focus: { desktop: 'center 48%', tablet: '54% 48%', mobile: '52% 45%' },
      },
      {
        id: 'city-panorama',
        code: 'CR-02',
        name: '天空城全景',
        region: '白塔回廊 · 主城方向',
        description: '沿着高塔拱廊，远眺浮岛、云桥与倾泻的瀑布。',
        image: 'assets/cloud-realm-background.png',
        focus: { desktop: 'center 46%', tablet: '54% 46%', mobile: '50% 44%' },
      },
    ],
    colors: {
      primary: '#173653',
      accent: '#b98b4d',
      panel: 'rgba(255, 252, 245, .82)',
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
    atmospheres: {
      day: { id: 'day', name: '晨光' },
      dusk: { id: 'dusk', name: '暮色' },
    },
  },
};

const KEY = 'library-theme';
const SCENE_KEY = 'library-scene';
const ATMOSPHERE_KEY = 'library-atmosphere';

export function applyScene(theme, id) {
  const scenes = theme.scenes?.length ? theme.scenes : [{ id: 'default', image: theme.background, focus: theme.backgroundFocus }];
  const scene = scenes.find((item) => item.id === id) || scenes.find((item) => item.id === theme.defaultScene) || scenes[0];
  const root = document.documentElement;
  root.dataset.scene = scene.id;
  root.style.setProperty('--scene-position', scene.focus?.desktop || theme.backgroundFocus.desktop);
  root.style.setProperty('--scene-position-mobile', scene.focus?.mobile || theme.backgroundFocus.mobile);
  root.style.setProperty('--scene-position-tablet', scene.focus?.tablet || scene.focus?.desktop || theme.backgroundFocus.tablet || theme.backgroundFocus.desktop);
  document.querySelector('.world__art')?.setAttribute('src', scene.image);
  localStorage.setItem(SCENE_KEY, scene.id);
  return scene;
}

export function applyTheme(id = 'cloud-realm') {
  const theme = THEMES[id] || THEMES['cloud-realm'];
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  const storedAtmosphere = localStorage.getItem(ATMOSPHERE_KEY);
  root.dataset.atmosphere = theme.atmospheres?.[storedAtmosphere] ? storedAtmosphere : theme.atmosphere;
  root.style.setProperty('--navy', theme.colors.primary);
  root.style.setProperty('--gold', theme.colors.accent);
  root.style.setProperty('--glass', theme.colors.panel);
  root.style.setProperty('--ink', theme.colors.text);
  localStorage.setItem(KEY, theme.id);
  applyScene(theme, localStorage.getItem(SCENE_KEY) || theme.defaultScene);
  return theme;
}

export function initTheme() {
  return applyTheme(localStorage.getItem(KEY) || 'cloud-realm');
}

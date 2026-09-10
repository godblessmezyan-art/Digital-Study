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
    background: 'assets/scenes/cloud-study.png',
    defaultScene: 'sky-study',
    scenes: [
      {
        id: 'sky-study',
        code: 'CR-01',
        name: '云端书房',
        region: '藏书塔 · 东侧观景窗',
        description: '越过黄铜仪器与摊开的书页，眺望天空主城。',
        image: 'assets/scenes/cloud-study.png',
        focus: { desktop: 'center 48%', tablet: '54% 48%', mobile: '52% 45%' },
      },
      {
        id: 'cloud-library-tower',
        code: 'CR-02',
        name: '云端藏书塔',
        region: '北侧藏书院 · 高层阅览室',
        description: '层层书架与悬空回廊向上延伸，收藏着云海之上的全部知识。',
        image: 'assets/scenes/cloud-library-tower.png',
        focus: { desktop: '56% 50%', tablet: '59% 50%', mobile: '67% 48%' },
      },
      {
        id: 'forbidden-specimen-greenhouse',
        code: 'CR-03',
        name: '禁忌标本温室',
        region: '下层研究院 · 封闭培育区',
        description: '古老植物在玻璃穹顶下静默生长，等待下一次被观察与记录。',
        image: 'assets/scenes/forbidden-specimen-greenhouse.png',
        focus: { desktop: '52% 50%', tablet: '55% 50%', mobile: '56% 49%' },
      },
      {
        id: 'astronomical-observatory',
        code: 'CR-04',
        name: '星象观测台',
        region: '最高层 · 星辰穹顶',
        description: '黄铜望远镜指向群星，在月光下测绘云海之外的遥远世界。',
        image: 'assets/scenes/astronomical-observatory.png',
        focus: { desktop: '50% 50%', tablet: '46% 50%', mobile: '39% 50%' },
      },
      {
        id: 'white-stone-courtyard',
        code: 'CR-05',
        name: '白石静庭',
        region: '西侧庭院 · 古树回廊',
        description: '水渠穿过白石与花木，风声在古树荫下慢慢安静下来。',
        image: 'assets/scenes/white-stone-courtyard.png',
        focus: { desktop: '53% 50%', tablet: '56% 50%', mobile: '59% 49%' },
      },
      {
        id: 'forgotten-archive',
        code: 'CR-06',
        name: '遗忘档案馆',
        region: '浮岛下层 · 封存石窟',
        description: '无数抽屉与卷宗沉睡在岩壁深处，只剩烛火替记忆守夜。',
        image: 'assets/scenes/forgotten-archive.png',
        focus: { desktop: '52% 50%', tablet: '55% 50%', mobile: '57% 49%' },
      },
      {
        id: 'sea-of-clouds-terrace',
        code: 'CR-07',
        name: '云海露台',
        region: '东南浮台 · 日出方向',
        description: '在云层之上翻开一页书，看晨光越过群山与蜿蜒长河。',
        image: 'assets/scenes/sea-of-clouds-terrace.png',
        focus: { desktop: '52% 50%', tablet: '55% 50%', mobile: '68% 49%' },
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
    categoryArtwork: 'assets/scenes/cloud-study.png',
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

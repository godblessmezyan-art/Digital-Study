/**
 * 世界观统一命名（单一事实来源）。
 *
 * 层级：
 * - WORLD.site：网站 / 产品名（云天幻境 / CLOUD REALM ARCHIVE），永不作为城市名使用；
 * - WORLD.city：天空之城专有地名（埃瑟瑞恩 / Aetherion），无人居住的古老主城；
 * - PAGE_NAMES：城内各功能空间的显示名与英文副标题。
 *
 * 新增页面或文案时优先引用此处常量，避免重复字符串散落各处。
 */
export const WORLD = {
  site: { zh: '云天幻境', en: 'CLOUD REALM ARCHIVE' },
  city: { zh: '埃瑟瑞恩', en: 'AETHERION' },
};

export const PAGE_NAMES = {
  shelf: { zh: '私人藏书', en: 'PERSONAL COLLECTION' },
  categories: { zh: '典籍目录', en: 'CATALOG OF TOMES' },
  reading: { zh: '静阅室', en: 'READING CHAMBER' },
  journal: { zh: '旅者手记', en: "TRAVELER'S JOURNAL" },
  plans: { zh: '远征计划', en: 'EXPEDITION PLANS' },
  studio: { zh: '铭文台', en: 'SCRIPTORIUM ALTAR' },
  curator: { zh: '秘典回响', en: 'ECHOES OF THE ARCHIVE' },
  content: { zh: '典籍档案', en: 'ARCHIVE OF TOMES' },
  settings: { zh: '圣所设置', en: 'SANCTUM SETTINGS' },
};

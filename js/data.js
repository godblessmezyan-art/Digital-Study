/**
 * 静态原型阶段的模拟数据
 * 未来接入真实 API 时，把这里的导出替换为请求层即可
 */

/** 分类（书房语境的名字，含图标名与数量） */
export const categories = [
  { id: 'all',    name: '全部书籍',   icon: 'grid',      count: 24 },
  { id: 'lit',    name: '文学',       icon: 'feather',   count: 6 },
  { id: 'mind',   name: '心灵成长',   icon: 'heart',     count: 5 },
  { id: 'life',   name: '生活智慧',   icon: 'leaf',      count: 4 },
  { id: 'philo',  name: '哲学思考',   icon: 'bulb',      count: 4 },
  { id: 'biz',    name: '商业思维',   icon: 'briefcase', count: 3 },
  { id: 'tech',   name: '科学探索',   icon: 'rocket',    count: 2 },
];

/** 书架书籍（progress: 0-100；cover: 1-6 对应 CSS 渐变书封） */
export const books = [
  { id: 1,  title: '瓦尔登湖',       author: '梭罗',                 category: 'lit',   unit: '章', chapters: 18, progress: 67,  cover: 1 },
  { id: 2,  title: '夜晚的潜水艇',   author: '陈春成',               category: 'lit',   unit: '章', chapters: 12, progress: 34,  cover: 3 },
  { id: 3,  title: '被讨厌的勇气',   author: '岸见一郎 / 古贺史健',  category: 'mind',  unit: '章', chapters: 10, progress: 50,  cover: 2 },
  { id: 4,  title: '人类简史',       author: '尤瓦尔·赫拉利',        category: 'tech',  unit: '章', chapters: 20, progress: 4,   cover: 6 },
  { id: 5,  title: '小王子',         author: '圣埃克苏佩里',         category: 'lit',   unit: '章', chapters: 21, progress: 100, cover: 5 },
  { id: 6,  title: '心流',           author: '米哈里·契克森米哈赖',  category: 'mind',  unit: '章', chapters: 10, progress: 30,  cover: 4 },
  { id: 7,  title: '慢煮生活',       author: '汪曾祺',               category: 'life',  unit: '章', chapters: 15, progress: 40,  cover: 2 },
  { id: 8,  title: '沉思录',         author: '马可·奥勒留',          category: 'philo', unit: '卷', chapters: 12, progress: 17,  cover: 6 },
  { id: 9,  title: '边城',           author: '沈从文',               category: 'lit',   unit: '章', chapters: 12, progress: 100, cover: 1 },
  { id: 10, title: '人间草木',       author: '汪曾祺',               category: 'lit',   unit: '辑', chapters: 8,  progress: 58,  cover: 5 },
  { id: 11, title: '月亮与六便士',   author: '毛姆',                 category: 'lit',   unit: '章', chapters: 24, progress: 12,  cover: 3 },
  { id: 12, title: '非暴力沟通',     author: '马歇尔·卢森堡',        category: 'mind',  unit: '章', chapters: 13, progress: 76,  cover: 1 },
  { id: 13, title: '自卑与超越',     author: '阿尔弗雷德·阿德勒',    category: 'mind',  unit: '章', chapters: 12, progress: 25,  cover: 6 },
  { id: 14, title: '当下的力量',     author: '埃克哈特·托利',        category: 'mind',  unit: '章', chapters: 10, progress: 62,  cover: 2 },
  { id: 15, title: '日日是好日',     author: '森下典子',             category: 'life',  unit: '章', chapters: 16, progress: 45,  cover: 4 },
  { id: 16, title: '生活十讲',       author: '蒋勋',                 category: 'life',  unit: '讲', chapters: 10, progress: 20,  cover: 3 },
  { id: 17, title: '人间值得',       author: '中村恒子',             category: 'life',  unit: '章', chapters: 9,  progress: 88,  cover: 5 },
  { id: 18, title: '苏菲的世界',     author: '乔斯坦·贾德',          category: 'philo', unit: '章', chapters: 30, progress: 36,  cover: 4 },
  { id: 19, title: '道德经',         author: '老子',                 category: 'philo', unit: '章', chapters: 81, progress: 15,  cover: 1 },
  { id: 20, title: '禅与摩托车维修艺术', author: '罗伯特·波西格',    category: 'philo', unit: '章', chapters: 18, progress: 5,   cover: 2 },
  { id: 21, title: '原则',           author: '瑞·达利欧',            category: 'biz',   unit: '章', chapters: 14, progress: 28,  cover: 6 },
  { id: 22, title: '纳瓦尔宝典',     author: '埃里克·乔根森',        category: 'biz',   unit: '章', chapters: 11, progress: 55,  cover: 3 },
  { id: 23, title: '卓有成效的管理者', author: '彼得·德鲁克',        category: 'biz',   unit: '章', chapters: 8,  progress: 0,   cover: 5 },
  { id: 24, title: '未来简史',       author: '尤瓦尔·赫拉利',        category: 'tech',  unit: '章', chapters: 18, progress: 0,   cover: 4 },
];

/** 最近阅读 */
export const recentReads = [
  { bookId: 1, chapterText: '读到第 12 章' },
  { bookId: 2, chapterText: '读到第 8 章' },
  { bookId: 3, chapterText: '读到第 5 章' },
];

/** 阅读生活：像生活记录，而非 KPI */
export const stats = [
  { icon: 'calendar', accent: false, num: 36,  unit: '天',   label: '陪伴阅读' },
  { icon: 'clock',    accent: false, num: 8.6, unit: '小时', label: '本周阅读' },
  { icon: 'bookshelf',accent: false, num: 12,  unit: '本',   label: '已经读完' },
  { icon: 'flame',    accent: true,  num: 7,   unit: '天',   label: '连续阅读' },
];

/** 今日书签 */
export const bookmarks = [
  {
    quote: '我步入丛林，因为我希望生活得有意义，我希望活得深刻，汲取生命中所有的精华。',
    source: '《瓦尔登湖》',
    meta: '第 12 章 · 今天 08:30',
  },
  {
    quote: '认知革命让人类能够相信虚构的故事，正是这些故事让我们得以大规模合作。',
    source: '《人类简史》',
    meta: '第 3 章 · 昨天 21:15',
  },
];

/**
 * 根据进度生成状态文案
 */
export function progressText(book) {
  if (book.progress >= 100) return '已读完';
  if (book.progress <= 0) return '未开始阅读';
  const chapter = Math.max(1, Math.round((book.chapters * book.progress) / 100));
  return `${book.chapters} ${book.unit} · 已读到第 ${chapter} ${book.unit}`;
}

/** 按分类取书 */
export function booksByCategory(catId) {
  return catId === 'all' ? books : books.filter((b) => b.category === catId);
}

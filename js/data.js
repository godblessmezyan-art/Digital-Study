export const stats = [
  { icon: 'bookshelf', label: '我的书架', detail: '珍藏所有的阅读时光', target: '#shelf' },
  { icon: 'compass', label: '书籍分类', detail: '探索不同的知识大陆', target: '#categories' },
  { icon: 'quill', label: '阅读笔记', detail: '记录思考与灵感', target: '#notes' },
  { icon: 'scroll', label: '精选书摘', detail: '收集触动心灵的文字', target: '#quotes' },
];

export const books = [
  { id: 1, title: '瓦尔登湖', author: '梭罗', category: 'literature', cover: 'linear-gradient(145deg,#8fa99f,#456f72)' },
  { id: 2, title: '三体', author: '刘慈欣', category: 'science', cover: 'linear-gradient(145deg,#132a48,#3b6990)' },
  { id: 3, title: '被讨厌的勇气', author: '岸见一郎', category: 'mind', cover: 'linear-gradient(145deg,#426fa5,#8a74ab)' },
  { id: 4, title: '人类简史', author: '尤瓦尔·赫拉利', category: 'history', cover: 'linear-gradient(145deg,#dac7a2,#9b6b45)', accent:'#68543d' },
  { id: 5, title: '沉思录', author: '马可·奥勒留', category: 'philosophy', cover: 'linear-gradient(145deg,#182d36,#576958)' },
  { id: 6, title: '夜晚的潜水艇', author: '陈春成', category: 'literature', cover: 'linear-gradient(145deg,#1b3760,#274f7d)' },
  { id: 7, title: '银河帝国', author: '艾萨克·阿西莫夫', category: 'science', cover: 'linear-gradient(145deg,#463853,#926f75)' },
];

export const notes = [
  { title: '关于宇宙与文明的思考', meta: '《三体》 · 2026/09/03' },
  { title: '人性的复杂与光辉', meta: '《被讨厌的勇气》 · 2026/08/29' },
  { title: '自由的真正含义', meta: '《沉思录》 · 2026/08/26' },
];

export const quotes = [
  { text: '人类的生命很短，但思想可以跨越时空，在更广阔的世界中延续。', source: '《三体》' },
  { text: '我们登上并非为了抵达，而是为了看见更大的风景。', source: '未知的旅人' },
  { text: '真正的自由，是理解了生活的边界后，依然选择热爱。', source: '《沉思录》' },
];

export const dailyBookmarks = [
  { text: '书籍是通往另一个世界的门。', source: '未知的旅人' },
  { text: '我们登上并非为了抵达，而是为了看见更大的风景。', source: '云海札记' },
  { text: '思想越过群星时，时间也会为阅读停驻。', source: '天空城藏书录' },
];

export const popularCategories = [
  { title: '哲学思考', subtitle: '探究生命的意义', category: 'philosophy', image: '/assets/categories/philosophy.png' },
  { title: '科幻宇宙', subtitle: '想象无垠的可能', category: 'science', image: '/assets/categories/science-fiction.png' },
  { title: '历史人文', subtitle: '回望文明的轨迹', category: 'history', image: '/assets/categories/history.png' },
  { title: '心理成长', subtitle: '遇见更好的自己', category: 'mind', image: '/assets/categories/inner-growth.png' },
  { title: '文学经典', subtitle: '感受文字的力量', category: 'literature', image: '/assets/categories/literature.png' },
  { title: '艺术审美', subtitle: '发现生活的美好', category: 'all', image: '/assets/categories/art-aesthetics.png' },
];

export const categories = [
  { id: 'all', label: '最近加入' }, { id: 'literature', label: '文学' },
  { id: 'science', label: '科学' }, { id: 'mind', label: '心灵成长' },
  { id: 'history', label: '历史' }, { id: 'philosophy', label: '哲学' },
];

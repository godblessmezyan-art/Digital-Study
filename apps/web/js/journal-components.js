import { EmptyState, PageHero } from './page-system.js';

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const MOODS = {
  calm: { label: '平静', icon: '◌' }, happy: { label: '开心', icon: '☼' },
  excited: { label: '兴奋', icon: '✦' }, tired: { label: '疲惫', icon: '☾' },
  sad: { label: '低落', icon: '◇' }, anxious: { label: '焦虑', icon: '≈' },
  thoughtful: { label: '沉思', icon: '∴' }, neutral: { label: '普通', icon: '·' },
};

export const WEATHER = {
  sunny: { label: '晴', icon: '☀' }, cloudy: { label: '多云', icon: '☁' },
  rain: { label: '雨', icon: '☂' }, snow: { label: '雪', icon: '❄' },
  fog: { label: '雾', icon: '≋' }, storm: { label: '风暴', icon: 'ϟ' },
};

export const PERIODS = { dawn: '清晨', day: '白昼', dusk: '黄昏', night: '深夜' };

export const escapeJournalHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export const todayValue = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export const localDate = value => new Date(`${value}T00:00:00`);
export const journalDateLabel = value => localDate(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

function excerpt(content) {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  return text.length > 150 ? `${text.slice(0, 150)}…` : text;
}

export function JournalTags(tags = [], { interactive = false } = {}) {
  return tags.length ? `<div class="journal-tags">${tags.map(tag => interactive
    ? `<button type="button" data-journal-tag="${escapeJournalHtml(tag)}">#${escapeJournalHtml(tag)}</button>`
    : `<span>#${escapeJournalHtml(tag)}</span>`).join('')}</div>` : '';
}

export function JournalHeader(entries) {
  const today = todayValue();
  const year = today.slice(0, 4), month = today.slice(0, 7);
  return PageHero({
    eyebrow: "TRAVELER'S JOURNAL", title: '旅者手记', description: '记录留在埃瑞瑞恩中的日子',
    stats: [
      { value: entries.filter(item => item.entryDate.startsWith(year)).length, label: '今年手记' },
      { value: entries.filter(item => item.entryDate.startsWith(month)).length, label: '本月' },
      { value: entries.length, label: '累计' },
    ], action: '<a class="journal-write" href="journal/new">＋ 写下今天</a>', className: 'journal-hero',
  });}

export function JournalTodayCard(entries) {
  const today = todayValue();
  const todays = entries.filter(item => item.entryDate === today);
  return `<section class="journal-today">
    <div><small>今天</small><time datetime="${today}">${today.replaceAll('-', ' · ')}</time></div>
    <p>${todays.length ? `今天已经留下 ${todays.length} 篇手记。` : '今天还没有留下记录。'}</p>
    <a href="${todays.length ? `journal/${encodeURIComponent(todays[0].id)}` : `journal/new?date=${today}`}">${todays.length ? '继续阅读' : '写下今天'}</a>
  </section>`;
}

export function JournalEntryPreview(entry, today) {
  const date = localDate(entry.entryDate), isToday = entry.entryDate === today;
  const mood = entry.mood ? MOODS[entry.mood] : null;
  return `<article class="journal-entry-row">
    <div class="journal-entry-date"><b>${String(date.getDate()).padStart(2, '0')}</b>${isToday ? '<span>今天</span>' : ''}</div>
    <span class="journal-node" aria-hidden="true"></span>
    <a class="journal-entry-card" href="journal/${encodeURIComponent(entry.id)}">
      <div class="journal-preview-meta"><time datetime="${entry.entryDate}">${date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</time>${mood ? `<span class="mood-${entry.mood}">${mood.icon} ${mood.label}</span>` : ''}</div>
      <h3>${escapeJournalHtml(entry.title)}</h3><p>${escapeJournalHtml(excerpt(entry.content))}</p>${JournalTags(entry.tags, { interactive: true })}
    </a>
  </article>`;
}

export function JournalMonthGroup(month, entries, today) {
  return `<section class="journal-month"><header><span>${monthNames[Number(month) - 1]}</span><small>${Number(month)} 月</small></header><div class="journal-month-line">${entries.map(entry => JournalEntryPreview(entry, today)).join('')}</div></section>`;
}

export function JournalYearGroup(year, months, today) {
  return `<section class="journal-year"><h2>${year}<span>YEAR</span></h2>${Object.entries(months).sort(([a], [b]) => Number(b) - Number(a)).map(([month, entries]) => JournalMonthGroup(month, entries, today)).join('')}</section>`;
}

export function JournalTimeline(entries) {
  const groups = entries.reduce((years, entry) => {
    const [year, month] = entry.entryDate.split('-');
    (years[year] ||= {})[month] ||= [];
    years[year][month].push(entry);
    return years;
  }, {});
  const today = todayValue();
  return `<div class="journal-timeline">${Object.entries(groups).sort(([a], [b]) => Number(b) - Number(a)).map(([year, months]) => JournalYearGroup(year, months, today)).join('')}</div>`;
}

export function JournalSearch({ years, tags }) {
  return `<form class="journal-search">
    <label class="journal-search-main"><span>搜索手记</span><input type="search" name="search" placeholder="搜索标题或记忆中的文字……"></label>
    <button type="button" class="journal-filter-toggle" aria-expanded="false">筛选</button>
    <div class="journal-filters" hidden>
      <label><span>年份</span><select name="year"><option value="">全部年份</option>${years.map(year => `<option>${year}</option>`).join('')}</select></label>
      <label><span>月份</span><select name="month"><option value="">全部月份</option>${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1} 月</option>`).join('')}</select></label>
      <label><span>标签</span><select name="tag"><option value="">全部标签</option>${tags.map(tag => `<option value="${escapeJournalHtml(tag)}"># ${escapeJournalHtml(tag)}</option>`).join('')}</select></label>
      <label><span>心境</span><select name="mood"><option value="">全部心境</option>${Object.entries(MOODS).map(([id, item]) => `<option value="${id}">${item.label}</option>`).join('')}</select></label>
    </div>
  </form>`;
}

export function JournalEmptyState({ authenticated = true, filtered = false } = {}) {
  return EmptyState({ title: !authenticated ? '登录后翻开你的手记' : filtered ? '没有找到这段记忆' : '尚未留下手记', description: !authenticated ? '每位旅者的文字只属于自己的云端书页。' : filtered ? '试着换一个关键词，或收起筛选重新翻阅。' : '旅途中的微光、念头与天气，都可以从今天开始写下。', action: `<a href="${authenticated ? 'journal/new' : '#'}" ${authenticated ? '' : 'data-journal-login'}>${authenticated ? '写下第一篇' : '登录账号'}</a>`, className: 'journal-empty' });
}

export function JournalSkeleton() {
  return `<section class="journal-page"><div class="journal-skeleton"><i></i><i></i><i></i><i></i></div></section>`;
}

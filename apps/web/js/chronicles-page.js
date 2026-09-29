import { getStoredUser } from './auth-client.js';
import { listChronicles } from './chronicles-client.js';
import { chronicleTypes } from './chronicles.js';

const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function card(entry) {
  if (entry.status === 'locked') return `<article class="chronicle-card is-locked" aria-label="记录尚未发现"><span class="chronicle-card__number">${String(entry.recordNumber).padStart(2, '0')}</span><span class="chronicle-card__lock">◇</span><div><small>UNKNOWN RECORD</small><h4>？？？</h4><p>记录尚未发现</p></div></article>`;
  const type = chronicleTypes[entry.type] || chronicleTypes.archive_record;
  return `<button class="chronicle-card ${entry.status === 'discovered' ? 'is-unread' : ''}" type="button" data-open-chronicle="${esc(entry.id)}">
    <span class="chronicle-card__number">${String(entry.recordNumber).padStart(2, '0')}</span><span class="chronicle-card__type">${type[2]}</span>
    <div><small>${type[1]} · ${type[0]}</small><h4>《${esc(entry.title)}》</h4><p>${esc(entry.excerpt)}</p><em>发现地点：${esc(entry.discoverLocation || '未知')}</em></div><i>${entry.status === 'discovered' ? '新记录' : '已阅'} →</i>
  </button>`;
}

function archiveMarkup(archive) {
  const seasons = Object.groupBy ? Object.groupBy(archive.entries, entry => entry.seasonId) : archive.entries.reduce((all, entry) => ((all[entry.seasonId] ||= []).push(entry), all), {});
  return Object.values(seasons).map(entries => {
    const chapters = entries.reduce((all, entry) => ((all[entry.chapterId] ||= []).push(entry), all), {});
    return `<section class="chronicle-season"><header><span><small>SEASON ${entries[0].seasonId.replace(/\D/g, '').padStart(2, '0')}</small><h2>《${esc(entries[0].seasonTitle)}》</h2></span><p>${entries.filter(item => item.status !== 'locked').length} / ${entries.length} 已发现</p></header>
      ${Object.values(chapters).map(chapter => `<section class="chronicle-chapter"><header><span>${chapter[0].chapterId.replace(/\D/g, '').padStart(2, '0')}</span><div><small>CHAPTER</small><h3>${esc(chapter[0].chapterTitle)}</h3></div></header><div class="chronicle-records">${chapter.map(card).join('')}</div></section>`).join('')}</section>`;
  }).join('');
}

export async function createChroniclesPage(root, { openLogin } = {}) {
  root.innerHTML = `<section class="chronicles-page"><header class="chronicles-hero"><div><small>WORLD CHRONICLES</small><h1>世界纪事</h1><p>「一些故事已经发生，而另一些仍等待被发现。」</p></div><aside><span>SEASON 01</span><strong data-chronicle-count>— / 12</strong><small>已发现记录</small></aside></header><div class="chronicles-content"><p class="chronicles-loading">正在翻阅云海档案……</p></div></section>`;
  if (!getStoredUser()) {
    root.querySelector('.chronicles-content').innerHTML = `<section class="chronicles-auth"><span>◇</span><h2>档案仍封存在云海之后</h2><p>登录后，你发现的世界记录会在不同设备间延续。</p><button type="button" data-chronicle-login>登录并翻开档案</button></section>`;
    root.querySelector('[data-chronicle-login]').addEventListener('click', () => openLogin?.());
    return () => {};
  }
  const render = async () => {
    try {
      const archive = await listChronicles();
      root.querySelector('[data-chronicle-count]').textContent = `${archive.discovered} / ${archive.total}`;
      root.querySelector('.chronicles-content').innerHTML = archiveMarkup(archive);
    } catch (error) {
      root.querySelector('.chronicles-content').innerHTML = `<section class="chronicles-auth"><h2>档案暂时无法打开</h2><p>${esc(error.message)}</p></section>`;
    }
  };
  const changed = () => void render();
  window.addEventListener('chroniclechange', changed);
  await render();
  return () => window.removeEventListener('chroniclechange', changed);
}

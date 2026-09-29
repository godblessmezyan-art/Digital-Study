import { deleteJournalEntry, getJournalEntry, listJournalEntries } from './journal-client.js';
import { escapeJournalHtml, journalDateLabel, JournalSkeleton, JournalTags, MOODS, PERIODS, WEATHER } from './journal-components.js';

const timeLabel = value => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

export async function JournalReader(root, { id, showToast, renderError }) {
  root.innerHTML = JournalSkeleton();
  try {
    const [entry, entries] = await Promise.all([getJournalEntry(id), listJournalEntries()]);
    const ordered = [...entries].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.updatedAt.localeCompare(a.updatedAt));
    const index = ordered.findIndex(item => item.id === entry.id);
    const newer = index > 0 ? ordered[index - 1] : null;
    const older = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
    const atmosphere = [entry.weather && WEATHER[entry.weather]?.label, entry.worldPeriod && PERIODS[entry.worldPeriod]].filter(Boolean).join(' · ');
    const mood = entry.mood && MOODS[entry.mood];
    const body = entry.content.split(/\n{2,}/).map(paragraph => `<p>${escapeJournalHtml(paragraph).replaceAll('\n', '<br>')}</p>`).join('');
    root.innerHTML = `<article class="journal-page journal-reader-page">
      <header class="journal-reader-head"><a href="journal">← 返回旅者手记</a><small>TRAVELER'S JOURNAL</small><div><a href="journal/${encodeURIComponent(entry.id)}/edit">编辑</a><button type="button" data-reader-delete>删除</button></div></header>
      <div class="journal-reader">
        <div class="journal-reader-date"><time datetime="${entry.entryDate}">${journalDateLabel(entry.entryDate)}</time>${atmosphere ? `<span>${escapeJournalHtml(atmosphere)}</span>` : ''}${mood ? `<span class="mood-${entry.mood}">心境：${mood.label}</span>` : ''}</div>
        <h1>《${escapeJournalHtml(entry.title)}》</h1>
        <div class="journal-reader-content">${body}</div>
        ${JournalTags(entry.tags)}
        <footer class="journal-reader-foot"><div><span>创建于 ${timeLabel(entry.createdAt)}</span><span>最后修改 ${timeLabel(entry.updatedAt)}</span></div><nav aria-label="相邻手记">${newer ? `<a href="journal/${encodeURIComponent(newer.id)}"><small>上一篇</small><b>${escapeJournalHtml(newer.title)}</b></a>` : '<span></span>'}${older ? `<a href="journal/${encodeURIComponent(older.id)}"><small>下一篇</small><b>${escapeJournalHtml(older.title)}</b></a>` : ''}</nav></footer>
      </div>
    </article>`;
    root.querySelector('[data-reader-delete]').onclick = async () => {
      if (!confirm(`确定删除《${entry.title}》吗？删除后无法恢复。`)) return;
      try { await deleteJournalEntry(entry.id); location.href = 'journal'; }
      catch (error) { showToast(error.message); }
    };
  } catch (error) {
    renderError(root, error.message, () => JournalReader(root, { id, showToast, renderError }));
  }
}

import { createJournalEntry, deleteJournalEntry, getJournalEntry, listJournalEntries, listJournalTemplates, updateJournalEntry } from './journal-client.js';
import { escapeJournalHtml, journalDateLabel, JournalSkeleton, MOODS, PERIODS, todayValue, WEATHER } from './journal-components.js';
import { JournalTagInput } from './journal-tag-input.js';
import { recordWorldFeedback } from './world-feedback.js';

const weatherFromWorld = weather => ({ clear: 'sunny', cloudy: 'cloudy', rain: 'rain', snow: 'snow' }[weather] || null);

function editorUrl(id) {
  const marker = '/journal';
  const index = location.pathname.indexOf(marker);
  const root = index >= 0 ? location.pathname.slice(0, index) : '';
  history.replaceState(null, '', `${root}/journal/${encodeURIComponent(id)}/edit`);
}

export async function JournalEditor(root, { id = '', showToast, renderError, worldSnapshot }) {
  root.innerHTML = JournalSkeleton();
  try {
    const [entry, allEntries, templates] = await Promise.all([
      id ? getJournalEntry(id) : null,
      listJournalEntries(),
      id ? Promise.resolve([]) : listJournalTemplates({ activeOnly: true }).catch(() => []),
    ]);
    const queryDate = new URLSearchParams(location.search).get('date');
    const world = !entry ? worldSnapshot?.() : null;
    const initial = entry || {
      entryDate: /^\d{4}-\d{2}-\d{2}$/.test(queryDate || '') ? queryDate : todayValue(),
      title: '', content: '', tags: [], mood: 'neutral',
      weather: world ? weatherFromWorld(world.weather) : null,
      worldPeriod: world?.effectivePeriod || null,
    };
    const defaultTemplate = !entry ? templates.find(item => item.isDefault) : null;
    if (defaultTemplate && !initial.content) initial.content = defaultTemplate.content || '';
    const suggestions = [...new Set(allEntries.flatMap(item => item.tags || []))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    root.innerHTML = `<section class="journal-page journal-editor-page">
      <header class="journal-editor-head"><a href="journal" data-editor-back>← 旅者手记</a><div class="journal-save-state" role="status" aria-live="polite">${entry ? '已保存' : '有未保存修改'}</div><button type="button" class="journal-save">保存</button></header>
      <form class="journal-editor">
        ${entry ? '' : `<div class="journal-template-row"><label><span>选择模板</span><select data-template-picker><option value="">空白开始</option>${templates.map(template => `<option value="${escapeJournalHtml(template.id)}"${template.isDefault ? ' selected' : ''}>${escapeJournalHtml(template.name)}${template.isDefault ? ' · 默认' : ''}</option>`).join('')}</select></label><a class="journal-template-manage" href="journal/templates">管理模板 →</a></div>`}
        <div class="journal-editor-meta">
          <label class="journal-date"><span>记录日期</span><input name="entryDate" type="date" value="${escapeJournalHtml(initial.entryDate)}" required><small data-date-label>${journalDateLabel(initial.entryDate)}</small></label>
          <label><span>心境</span><select name="mood">${Object.entries(MOODS).map(([value, item]) => `<option value="${value}"${initial.mood === value ? ' selected' : ''}>${item.icon} ${item.label}</option>`).join('')}</select></label>
          <label><span>天气</span><select name="weather"><option value="">未记录</option>${Object.entries(WEATHER).map(([value, item]) => `<option value="${value}"${initial.weather === value ? ' selected' : ''}>${item.icon} ${item.label}</option>`).join('')}</select></label>
          <span class="journal-period">${initial.worldPeriod && PERIODS[initial.worldPeriod] ? `世界时段 · ${PERIODS[initial.worldPeriod]}` : '未记录世界时段'}</span>
        </div>
        <input class="journal-title" name="title" maxlength="255" placeholder="为今天写一个标题" value="${escapeJournalHtml(initial.title)}" aria-label="日记标题" required>
        <textarea class="journal-content" name="content" maxlength="100000" placeholder="此刻，你想留下些什么……" aria-label="日记正文" required>${escapeJournalHtml(initial.content)}</textarea>
        <footer class="journal-editor-foot"><div class="journal-tag-editor"><span>标签</span><div class="journal-tag-list" data-tag-list></div><input data-tag-input list="journal-tag-suggestions" placeholder="输入标签后按 Enter"><datalist id="journal-tag-suggestions" data-tag-suggestions></datalist></div>${entry ? '<button type="button" class="journal-delete">删除这篇手记</button>' : ''}</footer>
      </form>
    </section>`;
    const form = root.querySelector('form'), state = root.querySelector('.journal-save-state'), saveButton = root.querySelector('.journal-save');
    let entryId = entry?.id || '', dirty = false, revision = 0, saving = false, queued = false, saveTimer, feedbackSent = false;
    const tags = JournalTagInput(root.querySelector('.journal-tag-editor'), initial.tags, suggestions, () => markDirty());
    const templatePicker = form.querySelector('[data-template-picker]');
    if (templatePicker) {
      let lastTemplateId = defaultTemplate?.id || '';
      templatePicker.addEventListener('change', () => {
        const content = form.elements.content;
        if (content.value.trim() && !window.confirm('切换模板会覆盖当前正文，确定继续吗？')) {
          templatePicker.value = lastTemplateId;
          return;
        }
        const template = templates.find(item => item.id === templatePicker.value);
        if (template) { content.value = template.content || ''; markDirty(); }
        lastTemplateId = templatePicker.value;
      });
    }
    const payload = () => ({
      title: form.elements.title.value.trim(), content: form.elements.content.value.trim(), entryDate: form.elements.entryDate.value,
      tags: tags.value(), mood: form.elements.mood.value || undefined, weather: form.elements.weather.value || undefined,
      worldPeriod: initial.worldPeriod || undefined, isPrivate: true,
    });
    const valid = data => data.title && data.content && data.entryDate;
    const save = async ({ silent = false } = {}) => {
      const data = payload();
      if (!valid(data)) { if (!silent) showToast('请填写日期、标题和正文'); return false; }
      if (saving) { queued = true; return false; }
      saving = true; queued = false; saveButton.disabled = true; state.textContent = '保存中…';
      const savingRevision = revision;
      try {
        const saved = entryId ? await updateJournalEntry(entryId, data) : await createJournalEntry(data);
        entryId = saved.id;
        if (!id) editorUrl(entryId);
        if (!entry && !feedbackSent) {
          feedbackSent = true;
          recordWorldFeedback('journal_saved', { id: saved.id, title: saved.title, entryDate: saved.entryDate });
        }
        dirty = revision !== savingRevision;
        state.textContent = dirty ? '有未保存修改' : '已保存';
        if (!silent) showToast('手记已保存');
        return true;
      } catch (error) { state.textContent = '保存失败'; showToast(error.message); return false; }
      finally {
        saving = false; saveButton.disabled = false;
        if (queued || dirty && revision !== savingRevision) scheduleSave();
      }
    };
    const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => save({ silent: true }), 1200); };
    function markDirty() { dirty = true; revision += 1; state.textContent = '有未保存修改'; scheduleSave(); }
    form.addEventListener('input', event => {
      if (event.target.name === 'entryDate' && event.target.value) root.querySelector('[data-date-label]').textContent = journalDateLabel(event.target.value);
      markDirty();
    });
    form.addEventListener('change', markDirty);
    saveButton.onclick = () => save();
    const leave = async event => {
      if (!dirty) return;
      event.preventDefault();
      if (!valid(payload())) { if (confirm('这篇手记尚未写完整，仍要离开吗？')) location.href = 'journal'; return; }
      const saved = await save({ silent: true });
      if (saved) location.href = 'journal';
      else if (confirm('手记尚未保存，仍要离开吗？')) location.href = 'journal';
    };
    root.querySelector('[data-editor-back]').onclick = leave;
    const beforeUnload = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    const keydown = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
      if (event.key === 'Escape') { event.preventDefault(); root.querySelector('[data-editor-back]').click(); }
    };
    window.addEventListener('beforeunload', beforeUnload); document.addEventListener('keydown', keydown);
    window.__journalCleanup = () => { clearTimeout(saveTimer); window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('keydown', keydown); };
    root.querySelector('.journal-delete')?.addEventListener('click', async () => {
      if (!confirm(`确定删除《${initial.title}》吗？删除后无法恢复。`)) return;
      try { await deleteJournalEntry(entryId); dirty = false; window.__journalCleanup?.(); location.href = 'journal'; }
      catch (error) { showToast(error.message); }
    });
  } catch (error) {
    renderError(root, error.message, () => JournalEditor(root, { id, showToast, renderError, worldSnapshot }));
  }
}

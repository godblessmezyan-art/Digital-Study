import {
  createJournalTemplate, deleteJournalTemplate, duplicateJournalTemplate,
  listJournalTemplates, setDefaultJournalTemplate, toggleJournalTemplateActive, updateJournalTemplate,
} from './journal-client.js';
import { escapeJournalHtml } from './journal-components.js';

function templateCard(template) {
  const badges = [
    template.isDefault ? '<span class="jt-badge jt-badge--default">默认</span>' : '',
    template.isBuiltin ? '<span class="jt-badge jt-badge--builtin">内置</span>' : '',
    template.isActive ? '' : '<span class="jt-badge jt-badge--off">已停用</span>',
  ].join('');
  const preview = escapeJournalHtml(String(template.content || '').replace(/\s+/g, ' ').trim().slice(0, 90));
  return `<article class="jt-card${template.isActive ? '' : ' is-off'}" data-template-id="${escapeJournalHtml(template.id)}">
    <header><h3>${escapeJournalHtml(template.name)}</h3><div class="jt-badges">${badges}</div></header>
    ${template.description ? `<p class="jt-desc">${escapeJournalHtml(template.description)}</p>` : ''}
    <pre class="jt-preview">${preview || '（空模板）'}${(template.content || '').length > 90 ? '…' : ''}</pre>
    ${(template.tags || []).length ? `<div class="jt-tags">${template.tags.map(tag => `<span>#${escapeJournalHtml(tag)}</span>`).join('')}</div>` : ''}
    <footer>
      <button type="button" data-tpl-action="edit">编辑</button>
      <button type="button" data-tpl-action="duplicate">复制</button>
      ${template.isDefault ? '' : '<button type="button" data-tpl-action="default">设为默认</button>'}
      <button type="button" data-tpl-action="toggle">${template.isActive ? '停用' : '启用'}</button>
      <button type="button" data-tpl-action="delete" class="jt-danger">删除</button>
    </footer>
  </article>`;
}

function editorDialogHtml(template) {
  const isEdit = Boolean(template?.id);
  return `<form class="jt-editor" data-tpl-editor>
    <label><span>模板名称 *</span><input name="name" maxlength="120" required value="${escapeJournalHtml(template?.name || '')}" placeholder="例如：每周复盘"></label>
    <label><span>模板说明</span><input name="description" maxlength="500" value="${escapeJournalHtml(template?.description || '')}" placeholder="一句话说明这个模板的用途"></label>
    <label><span>模板内容 *（与日记正文格式一致，纯文本）</span><textarea name="content" maxlength="20000" rows="12" required placeholder="今天发生了什么？&#10;&#10;……">${escapeJournalHtml(template?.content || '')}</textarea></label>
    <label><span>标签（逗号分隔）</span><input name="tags" value="${escapeJournalHtml((template?.tags || []).join('，'))}" placeholder="回顾，日常"></label>
    <label class="jt-check"><input name="isActive" type="checkbox" ${!template || template.isActive ? 'checked' : ''}><span>启用（可在写日记时选择）</span></label>
    <footer>
      <button type="button" data-tpl-cancel>取消</button>
      <button type="submit" class="jt-primary">${isEdit ? '保存模板' : '创建模板'}</button>
    </footer>
  </form>`;
}

export async function JournalTemplatesPage(root, { showToast, renderError }) {
  root.innerHTML = '<section class="journal-page"><div class="journal-skeleton"><i></i><i></i><i></i><i></i></div></section>';
  let templates = [];
  const load = async () => { templates = await listJournalTemplates(); };

  const paint = () => {
    root.innerHTML = `<section class="journal-page jt-page">
      <header class="journal-hero">
        <div class="journal-title-block"><small>JOURNAL TEMPLATES</small><h1>日记模板</h1><p>“想写的时候，不需要每次面对空白页面。”</p></div>
        <a class="journal-write" href="journal">← 返回手记</a>
        <button type="button" class="journal-write jt-new" data-tpl-new>＋ 新建模板</button>
      </header>
      <div class="jt-grid">${templates.length ? templates.map(templateCard).join('') : '<p class="jt-empty">还没有模板，点击右上角「新建模板」开始。</p>'}</div>
      <dialog class="jt-dialog" data-tpl-dialog></dialog>
    </section>`;
    bind();
  };

  const openEditor = (template) => {
    const dialog = root.querySelector('[data-tpl-dialog]');
    dialog.innerHTML = editorDialogHtml(template);
    if (!dialog.open) dialog.showModal();
    const form = dialog.querySelector('[data-tpl-editor]');
    form.querySelector('[data-tpl-cancel]').onclick = () => dialog.close();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(form);
      const input = {
        name: String(data.get('name') || '').trim(),
        description: String(data.get('description') || '').trim(),
        content: String(data.get('content') || ''),
        tags: String(data.get('tags') || '').split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
        isActive: Boolean(data.get('isActive')),
      };
      if (!input.name || !input.content.trim()) { showToast('模板名称和内容不能为空'); return; }
      try {
        if (template?.id) await updateJournalTemplate(template.id, input);
        else await createJournalTemplate(input);
        dialog.close();
        showToast(template?.id ? '模板已更新' : '模板已创建');
        await load(); paint();
      } catch (error) { showToast(error.message); }
    });
  };

  const bind = () => {
    root.querySelector('[data-tpl-new]').onclick = () => openEditor(null);
    root.querySelectorAll('.jt-card').forEach(card => {
      const id = card.dataset.templateId;
      card.querySelectorAll('[data-tpl-action]').forEach(button => button.onclick = async () => {
        const action = button.dataset.tplAction;
        try {
          if (action === 'edit') { openEditor(templates.find(item => item.id === id)); return; }
          if (action === 'duplicate') { await duplicateJournalTemplate(id); showToast('已创建副本'); }
          else if (action === 'default') { await setDefaultJournalTemplate(id); showToast('已设为默认模板'); }
          else if (action === 'toggle') {
            const template = templates.find(item => item.id === id);
            await toggleJournalTemplateActive(id, !template.isActive);
            showToast(template.isActive ? '模板已停用' : '模板已启用');
          } else if (action === 'delete') {
            const template = templates.find(item => item.id === id);
            if (!confirm(`确定删除模板「${template.name}」吗？删除后无法恢复。`)) return;
            await deleteJournalTemplate(id); showToast('模板已删除');
          }
          await load(); paint();
        } catch (error) { showToast(error.message); }
      });
    });
  };

  try {
    await load();
    paint();
  } catch (error) {
    renderError(root, error.message, () => JournalTemplatesPage(root, { showToast, renderError }));
  }
}

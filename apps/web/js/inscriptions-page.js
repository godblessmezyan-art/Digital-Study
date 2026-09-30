import { getStoredUser } from './auth-client.js';
import {
  createInscription, createInscriptionCategory, deleteInscription, deleteInscriptionCategory,
  duplicateInscription, getInscription, getInscriptionContexts, getInscriptionVersions,
  listInscriptionCategories, listInscriptions, reorderInscriptionCategories,
  setInscriptionEnabled, updateInscription, updateInscriptionCategory,
} from './inscriptions-client.js?v=1';
import { PageContainer, PageHero, PageToolbar, PaperSurface, EmptyState } from './page-system.js?v=2';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '&quot;': '"', '"': '&quot;', "'": '&#39;',
}[char]));

const TEMPLATE_KINDS = ['HTML_TEMPLATE', 'BOOK_TEMPLATE', 'JOURNAL_TEMPLATE', 'PLAN_TEMPLATE', 'NOTE_TEMPLATE'];
const TABS = [['all', '全部铭文'], ['prompt', '提示词'], ['template', '模板'], ['categories', '分类管理'], ['contexts', '应用场景']];

const blankForm = (type = 'PROMPT') => ({
  type, templateKind: 'BOOK_TEMPLATE', name: '', description: '', content: '', systemPrompt: '',
  categoryId: '', tags: '', bindings: [], variables: [], enabled: true, changeNote: '',
});

function rowMeta(item, contexts) {
  const bindings = (item.bindings || []).map(binding => {
    const context = contexts.find(entry => entry.key === binding.contextKey);
    return context ? context.label : binding.contextKey;
  });
  return `<div class="inscription-row__meta">
    ${item.category ? `<span>分类 <b>${esc(item.category.name)}</b></span>` : ''}
    <span>版本 <b>v${item.currentVersion}</b></span>
    <span>${item.enabled ? '启用中' : '已停用'}</span>
    <span>更新 ${new Date(item.updatedAt).toLocaleDateString('zh-CN')}</span>
    ${bindings.length ? `<span>应用 <b>${bindings.map(esc).join('、')}</b></span>` : '<span>未绑定场景</span>'}
    ${(item.tags || []).length ? `<span class="inscription-row__tags">${item.tags.map(tag => `#${esc(tag)}`).join('')}</span>` : ''}
  </div>`;
}

function listRows(items, contexts) {
  if (!items.length) return EmptyState({ title: '铭文库尚为空', description: '创建第一条铭文，或等待旧体系资源自动迁移入库。', icon: '✦' });
  return `<div class="inscription-list">${items.map(item => `
    <article class="inscription-row${item.enabled ? '' : ' is-disabled'}" data-inscription-id="${esc(item.id)}">
      <div class="inscription-row__main">
        <div class="inscription-row__head">
          <h3>${esc(item.name)}</h3>
          <span class="inscription-badge inscription-badge--${item.type}">${item.type === 'PROMPT' ? '提示词' : '模板'}</span>
          ${item.templateKind ? `<span class="inscription-badge inscription-badge--version">${esc(item.templateKind)}</span>` : ''}
          ${item.enabled ? '' : '<span class="inscription-badge inscription-badge--off">停用</span>'}
        </div>
        ${item.description ? `<p class="inscription-row__desc">${esc(item.description)}</p>` : ''}
        ${rowMeta(item, contexts)}
      </div>
      <div class="inscription-row__actions">
        <button type="button" data-action="view">查看</button>
        <button type="button" data-action="edit">编辑</button>
        <button type="button" data-action="duplicate">复制</button>
        <button type="button" data-action="toggle">${item.enabled ? '停用' : '启用'}</button>
        <button type="button" data-action="delete" class="danger">删除</button>
      </div>
    </article>`).join('')}</div>`;
}

function editorHtml(form, categories, contexts) {
  const bindable = contexts.filter(context => context.kind === form.type);
  return `<form class="inscription-editor" data-inscription-editor>
    <header><h2>${form.id ? '编辑铭文' : '新铭文'}</h2><button type="button" data-inscription-cancel aria-label="关闭">×</button></header>
    <div class="inscription-editor__row">
      <label><span>类型</span><select data-field="type" ${form.id ? 'disabled' : ''}><option value="PROMPT" ${form.type === 'PROMPT' ? 'selected' : ''}>提示词 PROMPT</option><option value="TEMPLATE" ${form.type === 'TEMPLATE' ? 'selected' : ''}>模板 TEMPLATE</option></select></label>
      ${form.type === 'TEMPLATE' ? `<label><span>模板类型</span><select data-field="templateKind">${TEMPLATE_KINDS.map(kind => `<option value="${kind}" ${form.templateKind === kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label>` : ''}
      <label><span>分类</span><select data-field="categoryId"><option value="">未分类</option>${categories.map(category => `<option value="${category.id}" ${String(form.categoryId) === String(category.id) ? 'selected' : ''}>${esc(category.name)}</option>`).join('')}</select></label>
      <label><span>状态</span><select data-field="enabled"><option value="1" ${form.enabled ? 'selected' : ''}>启用</option><option value="0" ${form.enabled ? '' : 'selected'}>停用</option></select></label>
    </div>
    <label><span>名称 *</span><input data-field="name" maxlength="160" required value="${esc(form.name)}"></label>
    <label><span>描述</span><input data-field="description" maxlength="2000" value="${esc(form.description)}"></label>
    <label><span>${form.type === 'PROMPT' ? 'Prompt 正文 *' : '模板正文 *（BOOK_TEMPLATE 为 AiTemplate JSON）'}</span><textarea data-field="content" maxlength="50000" required>${esc(form.content)}</textarea></label>
    ${form.type === 'PROMPT' ? `<label><span>System Prompt（可选）</span><textarea data-field="systemPrompt" rows="3" maxlength="20000">${esc(form.systemPrompt)}</textarea></label>` : ''}
    <label><span>标签（逗号分隔）</span><input data-field="tags" value="${esc((form.tags || []).join('，'))}"></label>
    <div><span class="field-label">应用场景（可多选）</span>
      <div class="inscription-bindings">${bindable.map(context => `<label><input type="checkbox" data-binding="${esc(context.key)}" ${form.bindings.includes(context.key) ? 'checked' : ''}><span>${esc(context.label)}</span></label>`).join('') || '<small>该类型暂无可用场景</small>'}</div>
    </div>
    <div><span class="field-label">变量（{{variable}} 体系）</span>
      <div class="inscription-variables" data-variables>
        ${form.variables.map((variable, index) => variableRowHtml(variable, index)).join('')}
      </div>
      <button type="button" data-add-variable>＋ 添加变量</button>
    </div>
    ${form.id ? '<label><span>本次修改说明（版本记录）</span><input data-field="changeNote" maxlength="500" placeholder="例如：加强反空话约束"></label>' : ''}
    <footer><button type="button" data-inscription-cancel>取消</button><button type="submit">${form.id ? '保存修改' : '创建铭文'}</button></footer>
  </form>`;
}

function variableRowHtml(variable, index) {
  return `<div class="inscription-variable-row" data-variable="${index}">
    <input data-var="key" value="${esc(variable.key)}" placeholder="key" maxlength="80">
    <input data-var="label" value="${esc(variable.label)}" placeholder="显示名" maxlength="120">
    <input data-var="defaultValue" value="${esc(variable.defaultValue || '')}" placeholder="默认值">
    <label title="必填"><input type="checkbox" data-var="required" ${variable.required ? 'checked' : ''}> 必填</label>
    <button type="button" data-remove-variable="${index}" aria-label="移除变量">✕</button>
  </div>`;
}

export async function createInscriptionsPage(root, { showToast, openLogin }) {
  if (!getStoredUser()) {
    root.innerHTML = `<section class="inscriptions-page">${EmptyState({ title: '登录后管理铭文库', description: '铭文库是埃瑟瑞恩的 Prompt 与模板中枢，需要管理员权限编辑。', action: '<button type="button" data-inscriptions-login>登录账号</button>' })}</section>`;
    root.querySelector('[data-inscriptions-login]').onclick = event => { event.preventDefault(); openLogin?.(); };
    return;
  }
  const state = {
    tab: 'all',
    filters: { q: '', type: '', categoryId: '', context: '', enabled: '', sort: '' },
    items: [], categories: [], contexts: [],
    editor: null,
  };

  const load = async () => {
    const type = state.tab === 'prompt' ? 'PROMPT' : state.tab === 'template' ? 'TEMPLATE' : '';
    const [items, categories, contexts] = await Promise.all([
      listInscriptions({ ...state.filters, type: type || state.filters.type }),
      listInscriptionCategories(),
      getInscriptionContexts(),
    ]);
    state.items = items; state.categories = categories; state.contexts = contexts;
  };

  const paint = () => {
    const filterControls = `
      <label class="inscriptions-toolbar-note" style="display:none"></label>
      <input data-filter="q" placeholder="搜索名称、描述或正文…" value="${esc(state.filters.q)}">
      <select data-filter="categoryId"><option value="">全部分类</option>${state.categories.map(category => `<option value="${category.id}" ${String(state.filters.categoryId) === String(category.id) ? 'selected' : ''}>${esc(category.name)}</option>`).join('')}</select>
      <select data-filter="context"><option value="">全部场景</option>${state.contexts.map(context => `<option value="${esc(context.key)}" ${state.filters.context === context.key ? 'selected' : ''}>${esc(context.label)}</option>`).join('')}</select>
      <select data-filter="enabled"><option value="">全部状态</option><option value="1" ${state.filters.enabled === '1' ? 'selected' : ''}>启用中</option><option value="0" ${state.filters.enabled === '0' ? 'selected' : ''}>已停用</option></select>
      <select data-filter="sort"><option value="">最近更新</option><option value="name" ${state.filters.sort === 'name' ? 'selected' : ''}>名称</option><option value="version" ${state.filters.sort === 'version' ? 'selected' : ''}>版本</option></select>
      <button type="button" class="primary" data-inscription-new>＋ 新铭文</button>`;
    root.innerHTML = `<section class="inscriptions-page">
      ${PageContainer(`
        ${PageHero({ eyebrow: 'INSCRIPTION ARCHIVE', title: '铭文库', description: '保存、编纂并分发埃瑟瑞恩中的知识铭文。', action: '<button type="button" class="primary" data-inscription-new>＋ 新铭文</button>' })}
        <div class="inscriptions-tabs" role="tablist">${TABS.map(([id, label]) => `<button type="button" role="tab" class="${state.tab === id ? 'is-active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div>
        ${state.tab === 'contexts' ? contextsView(state) : state.tab === 'categories' ? categoriesView(state) : `
          ${PageToolbar({ controls: filterControls })}
          ${PaperSurface(listRows(state.items, state.contexts), 'inscriptions-surface')}
        `}
        <dialog class="inscription-dialog" data-inscription-dialog></dialog>
      `)}
    </section>`;
    bind();
  };

  const contextsView = () => `<div class="context-grid">${state.contexts.map(context => {
    const bound = state.items.filter(item => (item.bindings || []).some(binding => binding.contextKey === context.key));
    return `<article class="context-card"><small>${esc(context.kind)}</small><h3>${esc(context.label)}</h3><code>${esc(context.key)}</code><p>${bound.length ? `已绑定 ${bound.length} 条铭文：${bound.slice(0, 3).map(item => esc(item.name)).join('、')}${bound.length > 3 ? '…' : ''}` : '暂无绑定铭文'}</p></article>`;
  }).join('')}</div>`;

  const categoriesView = () => `<div class="category-list">${state.categories.map((category, index) => `
    <div class="category-row" data-category-id="${category.id}">
      <div class="category-row__order">
        <button type="button" data-category-move="up" ${index === 0 ? 'disabled' : ''} aria-label="上移">↑</button>
        <button type="button" data-category-move="down" ${index === state.categories.length - 1 ? 'disabled' : ''} aria-label="下移">↓</button>
      </div>
      <div><b>${esc(category.name)}</b><small>${esc(category.slug)}${category.description ? ` · ${esc(category.description)}` : ''}</small></div>
      <span class="category-row__count">${category._count?.inscriptions ?? 0} 条铭文</span>
      <div class="category-row__actions">
        <button type="button" data-category-edit>编辑</button>
        <button type="button" data-category-delete class="danger">删除</button>
      </div>
    </div>`).join('')}
    <button type="button" class="primary" data-category-new style="justify-self:start;padding:10px 22px;border-radius:999px">＋ 新分类</button>
  </div>`;

  const openEditor = async (id) => {
    const dialog = root.querySelector('[data-inscription-dialog]');
    let form = blankForm();
    if (id) {
      const full = await getInscription(id);
      form = {
        id: full.id, type: full.type, templateKind: full.templateKind || 'BOOK_TEMPLATE', name: full.name,
        description: full.description || '', content: full.content, systemPrompt: full.systemPrompt || '',
        categoryId: full.categoryId || '', tags: (full.tags || []).join('，'),
        bindings: (full.bindings || []).map(binding => binding.contextKey),
        variables: (full.variables || []).map(variable => ({ key: variable.key, label: variable.label, defaultValue: variable.defaultValue || '', required: variable.required, placeholder: variable.placeholder || '' })),
        enabled: full.enabled, changeNote: '',
      };
    }
    state.editor = form;
    dialog.innerHTML = editorHtml(form, state.categories, state.contexts);
    if (!dialog.open) dialog.showModal();
    bindEditor(dialog);
  };

  const bindEditor = (dialog) => {
    const form = state.editor;
    dialog.querySelectorAll('[data-inscription-cancel]').forEach(button => button.onclick = () => dialog.close());
    dialog.querySelector('[data-field="type"]')?.addEventListener('change', event => {
      collectEditor(dialog);
      form.type = event.target.value;
      dialog.innerHTML = editorHtml(form, state.categories, state.contexts);
      bindEditor(dialog);
    });
    dialog.querySelector('[data-add-variable]').onclick = () => {
      collectEditor(dialog);
      form.variables.push({ key: '', label: '', defaultValue: '', required: false, placeholder: '' });
      dialog.innerHTML = editorHtml(form, state.categories, state.contexts);
      bindEditor(dialog);
    };
    dialog.querySelectorAll('[data-remove-variable]').forEach(button => button.onclick = () => {
      collectEditor(dialog);
      form.variables.splice(Number(button.dataset.removeVariable), 1);
      dialog.innerHTML = editorHtml(form, state.categories, state.contexts);
      bindEditor(dialog);
    });
    dialog.querySelector('[data-inscription-editor]').addEventListener('submit', async event => {
      event.preventDefault();
      collectEditor(dialog);
      const payload = {
        type: form.type,
        templateKind: form.type === 'TEMPLATE' ? form.templateKind : undefined,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        content: form.content,
        systemPrompt: form.type === 'PROMPT' ? form.systemPrompt.trim() || undefined : undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        tags: String(form.tags || '').split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
        bindings: form.bindings,
        variables: form.variables.filter(variable => variable.key.trim() && variable.label.trim()),
        enabled: form.enabled,
        changeNote: form.changeNote || undefined,
      };
      if (!payload.name || !payload.content.trim()) { showToast('名称与正文不能为空'); return; }
      try {
        if (form.id) await updateInscription(form.id, payload);
        else await createInscription(payload);
        dialog.close();
        showToast(form.id ? '铭文已保存（新版本）' : '铭文已创建');
        await load(); paint();
      } catch (error) { showToast(error.message); }
    });
  };

  const collectEditor = (dialog) => {
    const form = state.editor;
    dialog.querySelectorAll('[data-field]').forEach(input => {
      const field = input.dataset.field;
      if (field === 'enabled') form.enabled = input.value === '1';
      else form[field] = input.value;
    });
    form.bindings = [...dialog.querySelectorAll('[data-binding]:checked')].map(input => input.dataset.binding);
    form.variables = [...dialog.querySelectorAll('[data-variable]')].map(row => ({
      key: row.querySelector('[data-var="key"]').value.trim(),
      label: row.querySelector('[data-var="label"]').value.trim(),
      defaultValue: row.querySelector('[data-var="defaultValue"]').value,
      required: row.querySelector('[data-var="required"]').checked,
      placeholder: '',
    }));
  };

  const openViewer = async (id) => {
    const [full, versions] = await Promise.all([getInscription(id), getInscriptionVersions(id).catch(() => [])]);
    const dialog = root.querySelector('[data-inscription-dialog]');
    dialog.innerHTML = `<div class="inscription-editor inscription-view">
      <header><h2>${esc(full.name)} <small>v${full.currentVersion}</small></h2><button type="button" data-inscription-cancel aria-label="关闭">×</button></header>
      ${full.description ? `<p>${esc(full.description)}</p>` : ''}
      ${full.systemPrompt ? `<h3>System Prompt</h3><pre>${esc(full.systemPrompt)}</pre>` : ''}
      <h3>${full.type === 'PROMPT' ? 'Prompt 正文' : '模板正文'}</h3><pre>${esc(full.content)}</pre>
      <h3>版本历史</h3>
      <ul class="inscription-versions">${versions.map(version => `<li><b>v${version.version}</b><span>${new Date(version.createdAt).toLocaleString('zh-CN')}</span><span>${esc(version.changeNote || '')}</span></li>`).join('') || '<li>暂无版本记录</li>'}</ul>
    </div>`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelectorAll('[data-inscription-cancel]').forEach(button => button.onclick = () => dialog.close());
  };

  const bind = () => {
    root.querySelectorAll('[data-tab]').forEach(button => button.onclick = async () => {
      state.tab = button.dataset.tab;
      await load(); paint();
    });
    root.querySelectorAll('[data-filter]').forEach(input => {
      const handler = async () => { state.filters[input.dataset.filter] = input.value; await load(); paint(); };
      if (input.dataset.filter === 'q') input.addEventListener('input', () => { clearTimeout(input.timer); input.timer = setTimeout(handler, 350); });
      else input.addEventListener('change', handler);
    });
    root.querySelectorAll('[data-inscription-new]').forEach(button => button.onclick = () => openEditor(null));
    root.querySelectorAll('.inscription-row').forEach(row => {
      const id = row.dataset.inscriptionId;
      row.querySelectorAll('[data-action]').forEach(button => button.onclick = async () => {
        const action = button.dataset.action;
        try {
          if (action === 'view') await openViewer(id);
          else if (action === 'edit') await openEditor(id);
          else if (action === 'duplicate') { await duplicateInscription(id); showToast('已创建副本（默认停用）'); await load(); paint(); }
          else if (action === 'toggle') {
            const item = state.items.find(entry => entry.id === id);
            await setInscriptionEnabled(id, !item.enabled);
            showToast(item.enabled ? '铭文已停用' : '铭文已启用');
            await load(); paint();
          } else if (action === 'delete') {
            const item = state.items.find(entry => entry.id === id);
            if (!confirm(`确定删除铭文「${item.name}」吗？其版本与绑定将一并删除。`)) return;
            await deleteInscription(id); showToast('铭文已删除'); await load(); paint();
          }
        } catch (error) { showToast(error.message); }
      });
    });
    root.querySelector('[data-category-new]')?.addEventListener('click', () => openCategoryEditor(null));
    root.querySelectorAll('[data-category-id]').forEach(row => {
      const id = Number(row.dataset.categoryId);
      row.querySelector('[data-category-edit]').onclick = () => openCategoryEditor(id);
      row.querySelector('[data-category-delete]').onclick = async () => {
        const category = state.categories.find(item => item.id === id);
        if (!confirm(`确定删除分类「${category.name}」吗？`)) return;
        try { await deleteInscriptionCategory(id); showToast('分类已删除'); await load(); paint(); }
        catch (error) { showToast(error.message); }
      };
      row.querySelectorAll('[data-category-move]').forEach(button => button.onclick = async () => {
        const index = state.categories.findIndex(item => item.id === id);
        const target = index + (button.dataset.categoryMove === 'up' ? -1 : 1);
        if (target < 0 || target >= state.categories.length) return;
        const items = state.categories.map((category, position) => ({ id: category.id, sortOrder: position === index ? target : position === target ? index : position }));
        try { await reorderInscriptionCategories(items); await load(); paint(); }
        catch (error) { showToast(error.message); }
      });
    });
  };

  const openCategoryEditor = (id) => {
    const category = id ? state.categories.find(item => item.id === id) : null;
    const dialog = root.querySelector('[data-inscription-dialog]');
    dialog.innerHTML = `<form class="inscription-editor" data-category-editor>
      <header><h2>${category ? '编辑分类' : '新分类'}</h2><button type="button" data-inscription-cancel aria-label="关闭">×</button></header>
      <label><span>slug *</span><input data-category-field="slug" maxlength="100" required value="${esc(category?.slug || '')}" placeholder="例如 learning"></label>
      <label><span>名称 *</span><input data-category-field="name" maxlength="120" required value="${esc(category?.name || '')}"></label>
      <label><span>描述</span><input data-category-field="description" maxlength="1000" value="${esc(category?.description || '')}"></label>
      <label><span>排序</span><input data-category-field="sortOrder" type="number" value="${category?.sortOrder ?? 0}"></label>
      <footer><button type="button" data-inscription-cancel>取消</button><button type="submit">保存</button></footer>
    </form>`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelectorAll('[data-inscription-cancel]').forEach(button => button.onclick = () => dialog.close());
    dialog.querySelector('[data-category-editor]').addEventListener('submit', async event => {
      event.preventDefault();
      const payload = {
        slug: dialog.querySelector('[data-category-field="slug"]').value.trim(),
        name: dialog.querySelector('[data-category-field="name"]').value.trim(),
        description: dialog.querySelector('[data-category-field="description"]').value.trim() || undefined,
        sortOrder: Number(dialog.querySelector('[data-category-field="sortOrder"]').value || 0),
      };
      try {
        if (category) await updateInscriptionCategory(category.id, payload);
        else await createInscriptionCategory(payload);
        dialog.close(); showToast('分类已保存'); await load(); paint();
      } catch (error) { showToast(error.message); }
    });
  };

  try {
    await load();
    paint();
  } catch (error) {
    root.innerHTML = `<section class="inscriptions-page">${EmptyState({ title: '铭文库暂时无法打开', description: error.message, action: '<button type="button" data-retry>重新尝试</button>' })}</section>`;
    root.querySelector('[data-retry]').onclick = () => createInscriptionsPage(root, { showToast, openLogin });
  }
}

import {
  createPlanTask, deletePlan, deletePlanTask, getPlan, reorderPlanTasks, updatePlan, updatePlanTask,
} from './plans-client.js';
import { dueLabel, escapePlanHtml, PLAN_STATUS, PlanSkeleton, TASK_PRIORITY, TASK_STATUS } from './plan-components.js';
import { openPlanAiDialog } from './plan-ai.js';

const MAX_DEPTH = 2;

function taskNode(task, handlers) {
  const priority = TASK_PRIORITY[task.priority] || TASK_PRIORITY.medium;
  const done = task.status === 'completed';
  const cancelled = task.status === 'cancelled';
  const childInfo = task.childCount ? `<span class="task-children">${task.completedChildCount || 0}/${task.childCount}</span>` : '';
  return `<li class="task-item depth-${task.depth}${done ? ' is-done' : ''}${cancelled ? ' is-cancelled' : ''}" data-task-id="${escapePlanHtml(task.id)}" data-parent-id="${escapePlanHtml(task.parentId || '')}" draggable="true">
    <div class="task-row">
      <button type="button" class="task-check" data-action="toggle" aria-label="${done ? '重新打开任务' : '完成任务'}" title="${done ? '重新打开' : '完成'}">${done ? '✓' : ''}</button>
      <span class="task-drag" aria-hidden="true" title="拖动排序">⠿</span>
      <div class="task-main">
        <strong class="task-title" data-action="edit">${escapePlanHtml(task.title)}</strong>
        ${task.description ? `<p class="task-desc">${escapePlanHtml(task.description)}</p>` : ''}
        <div class="task-meta">
          <span class="task-status st-${task.status}">${TASK_STATUS[task.status]?.icon || '○'} ${TASK_STATUS[task.status]?.label || task.status}</span>
          <span class="task-priority ${priority.className}">${priority.label}</span>
          ${task.estimatedMinutes ? `<span class="task-minutes">约 ${task.estimatedMinutes} 分钟</span>` : ''}
          ${task.dueDate ? dueLabel(task.dueDate) : ''}
          ${childInfo}
        </div>
        ${task.acceptanceCriteria ? `<p class="task-criteria"><small>完成标准</small>${escapePlanHtml(task.acceptanceCriteria)}</p>` : ''}
      </div>
      <div class="task-actions">
        ${task.depth < MAX_DEPTH ? '<button type="button" data-action="ai" title="AI 继续拆解">✦</button>' : ''}
        ${task.depth < MAX_DEPTH ? '<button type="button" data-action="add-child" title="添加子任务">＋</button>' : ''}
        <button type="button" data-action="edit" title="编辑任务">✎</button>
        <button type="button" data-action="up" title="上移">↑</button>
        <button type="button" data-action="down" title="下移">↓</button>
        <button type="button" data-action="delete" title="删除任务" class="danger">✕</button>
      </div>
    </div>
    ${task.children?.length ? `<ul class="task-sublist">${task.children.map(child => taskNode(child, handlers)).join('')}</ul>` : ''}
  </li>`;
}

function taskFormHtml(task, { isChild = false } = {}) {
  return `<form class="plan-task-form" data-task-form>
    <label><span>任务标题 *</span><input name="title" maxlength="255" required value="${escapePlanHtml(task?.title || '')}" placeholder="可直接执行的具体动作"></label>
    <label><span>任务说明</span><textarea name="description" maxlength="5000" rows="3" placeholder="补充上下文（可选）">${escapePlanHtml(task?.description || '')}</textarea></label>
    <div class="plan-form-row">
      <label><span>状态</span><select name="status">${Object.entries(TASK_STATUS).map(([value, item]) => `<option value="${value.toUpperCase()}"${(task?.status || 'pending') === value ? ' selected' : ''}>${item.label}</option>`).join('')}</select></label>
      <label><span>优先级</span><select name="priority">${Object.entries(TASK_PRIORITY).map(([value, item]) => `<option value="${value.toUpperCase()}"${(task?.priority || 'medium') === value ? ' selected' : ''}>${item.label}</option>`).join('')}</select></label>
      <label><span>预计分钟</span><input name="estimatedMinutes" type="number" min="1" max="100000" value="${task?.estimatedMinutes || ''}"></label>
      <label><span>截止日期</span><input name="dueDate" type="date" value="${escapePlanHtml(task?.dueDate || '')}"></label>
    </div>
    <label><span>完成标准（怎样算完成）</span><textarea name="acceptanceCriteria" maxlength="2000" rows="2" placeholder="可验证的完成标准">${escapePlanHtml(task?.acceptanceCriteria || '')}</textarea></label>
    <footer><button type="button" data-task-cancel>取消</button><button type="submit" class="plan-primary">${task?.id ? '保存任务' : isChild ? '添加子任务' : '添加任务'}</button></footer>
  </form>`;
}

function planFormHtml(plan) {
  return `<form class="plan-task-form" data-plan-edit-form>
    <label><span>计划标题 *</span><input name="title" maxlength="255" required value="${escapePlanHtml(plan.title)}"></label>
    <label><span>目标说明</span><textarea name="description" maxlength="5000" rows="3">${escapePlanHtml(plan.description || '')}</textarea></label>
    <div class="plan-form-row">
      <label><span>状态</span><select name="status">${Object.entries(PLAN_STATUS).map(([value, item]) => `<option value="${value.toUpperCase()}"${plan.status === value ? ' selected' : ''}>${item.label}</option>`).join('')}</select></label>
      <label><span>开始日期</span><input name="startDate" type="date" value="${escapePlanHtml(plan.startDate || '')}"></label>
      <label><span>截止日期</span><input name="dueDate" type="date" value="${escapePlanHtml(plan.dueDate || '')}"></label>
    </div>
    <footer><button type="button" data-plan-edit-cancel>取消</button><button type="submit" class="plan-primary">保存计划</button></footer>
  </form>`;
}

export async function PlanDetailPage(root, { id, showToast }) {
  root.innerHTML = PlanSkeleton();
  let plan;

  const load = async () => { plan = await getPlan(id); };

  const paint = () => {
    const status = PLAN_STATUS[plan.status] || PLAN_STATUS.draft;
    root.innerHTML = `<section class="plans-page plan-detail">
      <header class="plan-detail-head">
        <a href="plans">← 全部计划</a>
        <div class="plan-detail-title">
          <h1>${escapePlanHtml(plan.title)}</h1>
          <span class="plan-status ${status.className}">${status.label}</span>
        </div>
        ${plan.description ? `<p class="plan-detail-desc">${escapePlanHtml(plan.description)}</p>` : ''}
        <div class="plan-detail-meta">
          ${plan.startDate ? `<span>开始 ${plan.startDate}</span>` : ''}
          ${plan.dueDate ? dueLabel(plan.dueDate) : ''}
          <span class="plan-detail-progress"><b>${plan.completedTasks}</b> / ${plan.totalTasks} 任务 · ${plan.progress}%</span>
        </div>
        <div class="plan-progress plan-progress--wide" role="img" aria-label="进度 ${plan.progress}%"><i style="width:${plan.progress}%"></i></div>
        <div class="plan-detail-actions">
          <button type="button" class="plan-ghost" data-plan-edit>编辑计划</button>
          <button type="button" class="plan-ghost danger" data-plan-delete>删除计划</button>
        </div>
      </header>
      <div class="plan-toolbar">
        <button type="button" class="plan-primary" data-add-task>＋ 添加任务</button>
        <button type="button" class="plan-ai" data-ai-breakdown>✦ AI 帮我拆解</button>
        <small class="plan-toolbar-hint">拖动 ⠿ 可调整同级任务顺序</small>
      </div>
      <ul class="task-tree" data-task-tree>
        ${plan.tasks.length ? plan.tasks.map(task => taskNode(task)).join('') : '<li class="task-empty">还没有任务。手动添加一个，或让 AI 帮你把目标拆成可执行的小任务。</li>'}
      </ul>
      <dialog class="plan-dialog" data-plan-dialog></dialog>
    </section>`;
    bind();
  };

  const reload = async () => { await load(); paint(); };

  const openDialog = (html) => {
    const dialog = root.querySelector('[data-plan-dialog]');
    dialog.innerHTML = html;
    if (!dialog.open) dialog.showModal();
    return dialog;
  };

  const openTaskForm = (task, { parentId = '' } = {}) => {
    const dialog = openDialog(taskFormHtml(task, { isChild: Boolean(parentId) }));
    const form = dialog.querySelector('[data-task-form]');
    form.querySelector('[data-task-cancel]').onclick = () => dialog.close();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(form);
      const input = {
        title: String(data.get('title') || '').trim(),
        description: String(data.get('description') || '').trim(),
        status: String(data.get('status') || 'PENDING'),
        priority: String(data.get('priority') || 'MEDIUM'),
        estimatedMinutes: data.get('estimatedMinutes') ? Number(data.get('estimatedMinutes')) : undefined,
        dueDate: String(data.get('dueDate') || '') || undefined,
        acceptanceCriteria: String(data.get('acceptanceCriteria') || '').trim(),
        ...(task?.id ? {} : { parentId: parentId || undefined }),
      };
      if (!input.title) { showToast('请填写任务标题'); return; }
      try {
        if (task?.id) await updatePlanTask(plan.id, task.id, input);
        else await createPlanTask(plan.id, input);
        dialog.close();
        showToast(task?.id ? '任务已更新' : '任务已添加');
        await reload();
      } catch (error) { showToast(error.message); }
    });
  };

  const bind = () => {
    root.querySelector('[data-plan-edit]').onclick = () => {
      const dialog = openDialog(planFormHtml(plan));
      const form = dialog.querySelector('[data-plan-edit-form]');
      form.querySelector('[data-plan-edit-cancel]').onclick = () => dialog.close();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const data = new FormData(form);
        try {
          await updatePlan(plan.id, {
            title: String(data.get('title') || '').trim(),
            description: String(data.get('description') || '').trim(),
            status: String(data.get('status') || 'ACTIVE'),
            startDate: String(data.get('startDate') || '') || undefined,
            dueDate: String(data.get('dueDate') || '') || undefined,
          });
          dialog.close(); showToast('计划已更新'); await reload();
        } catch (error) { showToast(error.message); }
      });
    };
    root.querySelector('[data-plan-delete]').onclick = async () => {
      if (!confirm(`确定删除计划「${plan.title}」吗？其下所有任务都会一并删除，且无法恢复。`)) return;
      try { await deletePlan(plan.id); location.href = 'plans'; }
      catch (error) { showToast(error.message); }
    };
    root.querySelector('[data-add-task]').onclick = () => openTaskForm(null);
    root.querySelector('[data-ai-breakdown]').onclick = () => openPlanAiDialog({
      root, plan, showToast,
      onApplied: async message => { showToast(message); await reload(); },
    });

    const tree = root.querySelector('[data-task-tree]');
    tree.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const item = button.closest('[data-task-id]');
      const task = findTask(plan.tasks, item.dataset.taskId);
      if (!task) return;
      const action = button.dataset.action;
      try {
        if (action === 'toggle') {
          const next = task.status === 'completed' ? 'PENDING' : 'COMPLETED';
          await updatePlanTask(plan.id, task.id, { status: next });
          await reload();
        } else if (action === 'edit') openTaskForm(task);
        else if (action === 'add-child') openTaskForm(null, { parentId: task.id });
        else if (action === 'ai') openPlanAiDialog({ root, plan, task, showToast, onApplied: async message => { showToast(message); await reload(); } });
        else if (action === 'delete') {
          if (!confirm(`确定删除任务「${task.title}」吗？其子任务也会一并删除。`)) return;
          await deletePlanTask(plan.id, task.id);
          showToast('任务已删除'); await reload();
        } else if (action === 'up' || action === 'down') {
          const siblings = getSiblings(plan.tasks, task).sort((a, b) => a.order - b.order);
          const index = siblings.findIndex(item2 => item2.id === task.id);
          const target = siblings[index + (action === 'up' ? -1 : 1)];
          if (!target) return;
          await reorderPlanTasks(plan.id, [
            { id: task.id, order: target.order },
            { id: target.id, order: task.order },
          ]);
          await reload();
        }
      } catch (error) { showToast(error.message); }
    });

    // Drag & drop reordering within the same level.
    let dragId = '';
    tree.addEventListener('dragstart', event => {
      const item = event.target.closest('[data-task-id]');
      if (!item) return;
      dragId = item.dataset.taskId;
      item.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
    });
    tree.addEventListener('dragend', () => {
      dragId = '';
      tree.querySelectorAll('.is-dragging,.is-drag-over').forEach(node => node.classList.remove('is-dragging', 'is-drag-over'));
    });
    tree.addEventListener('dragover', event => {
      if (!dragId) return;
      const item = event.target.closest('[data-task-id]');
      if (!item || item.dataset.taskId === dragId) return;
      const dragged = findTask(plan.tasks, dragId);
      const hovered = findTask(plan.tasks, item.dataset.taskId);
      if (!dragged || !hovered || (dragged.parentId || '') !== (hovered.parentId || '')) return;
      event.preventDefault();
      tree.querySelectorAll('.is-drag-over').forEach(node => node.classList.remove('is-drag-over'));
      item.classList.add('is-drag-over');
    });
    tree.addEventListener('drop', async event => {
      const item = event.target.closest('[data-task-id]');
      if (!item || !dragId || item.dataset.taskId === dragId) return;
      event.preventDefault();
      const dragged = findTask(plan.tasks, dragId);
      const hovered = findTask(plan.tasks, item.dataset.taskId);
      if (!dragged || !hovered || (dragged.parentId || '') !== (hovered.parentId || '')) return;
      try {
        await reorderPlanTasks(plan.id, [
          { id: dragged.id, order: hovered.order },
          { id: hovered.id, order: dragged.order },
        ]);
        await reload();
      } catch (error) { showToast(error.message); }
    });
  };

  try {
    await load();
    paint();
  } catch (error) {
    root.innerHTML = `<section class="plans-page"><div class="plans-error"><span>计划无法打开</span><p>${escapePlanHtml(error.message)}</p><button type="button">重新尝试</button></div></section>`;
    root.querySelector('button').onclick = () => PlanDetailPage(root, { id, showToast });
  }
}

function findTask(tasks, id) {
  for (const task of tasks) {
    if (task.id === id) return task;
    const found = task.children?.length ? findTask(task.children, id) : null;
    if (found) return found;
  }
  return null;
}

function getSiblings(tasks, task) {
  if (!task.parentId) return tasks;
  const parent = findTask(tasks, task.parentId);
  return parent?.children || [];
}

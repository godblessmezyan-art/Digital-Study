import { aiApplyBreakdown, aiBreakdown, aiBreakdownTask } from './plans-client.js';
import { escapePlanHtml, TASK_PRIORITY } from './plan-components.js';

/**
 * AI Plan Assistant dialog. Two modes:
 * - plan mode: collect goal context, break the whole plan into milestones;
 * - task mode: break one existing task into subtask groups.
 * The result is always an editable preview; nothing is written until the
 * user explicitly clicks 「应用到计划」.
 */
export function openPlanAiDialog({ root, plan, task = null, showToast, onApplied }) {
  const dialog = root.querySelector('[data-plan-dialog]') || document.createElement('dialog');
  if (!dialog.isConnected) { dialog.className = 'plan-dialog'; document.body.append(dialog); }
  const isTaskMode = Boolean(task);

  let breakdown = null;

  const collectFormHtml = () => `<div class="ai-plan" data-ai-plan>
    <header>
      <small>${isTaskMode ? 'AI TASK BREAKDOWN' : 'AI PLAN ASSISTANT'}</small>
      <h2>${isTaskMode ? `拆解任务：${escapePlanHtml(task.title)}` : 'AI 帮我拆解'}</h2>
      <button type="button" data-ai-close aria-label="关闭">×</button>
    </header>
    ${isTaskMode ? `
      <p class="ai-plan-intro">AI 会把这个任务拆成更小、可直接执行的子任务。拆解结果先预览，确认后才会写入计划。</p>
      <form class="ai-plan-form" data-ai-form>
        <label><span>补充要求（可选）</span><textarea name="instruction" rows="3" maxlength="2000" placeholder="例如：重点拆听力和口语；每一步控制在 1 小时内"></textarea></label>
        <footer><button type="submit" class="plan-primary ai-run">✦ 开始拆解</button></footer>
      </form>` : `
      <p class="ai-plan-intro">先补充一些背景，AI 才能拆出真正可执行的任务，而不是一句「努力学习」。</p>
      <form class="ai-plan-form" data-ai-form>
        <label><span>目标 *</span><input name="goal" maxlength="255" required value="${escapePlanHtml(plan.title)}"></label>
        <label><span>目标描述</span><textarea name="goalDescription" rows="2" maxlength="5000" placeholder="做到什么程度算成功？">${escapePlanHtml(plan.description || '')}</textarea></label>
        <div class="ai-plan-grid">
          <label><span>截止日期</span><input name="dueDate" type="date" value="${escapePlanHtml(plan.dueDate || '')}"></label>
          <label><span>每天/每周可投入时间</span><input name="availableTime" maxlength="1000" placeholder="例如：工作日 1.5 小时，周末 3 小时"></label>
        </div>
        <label><span>当前状态</span><textarea name="currentState" rows="2" maxlength="2000" placeholder="例如：目前 5.0 分，弱项是听力和口语"></textarea></label>
        <label><span>限制条件</span><textarea name="constraints" rows="2" maxlength="2000" placeholder="例如：预算有限、只能晚上学习"></textarea></label>
        <label><span>已有资源</span><textarea name="resources" rows="2" maxlength="2000" placeholder="例如：剑桥真题 10-18、某网课"></textarea></label>
        <footer><button type="submit" class="plan-primary ai-run">✦ 开始拆解</button></footer>
      </form>`}
  </div>`;

  const loadingHtml = () => `<div class="ai-plan" data-ai-plan>
    <header><small>AI PLAN ASSISTANT</small><h2>正在拆解…</h2></header>
    <div class="ai-plan-loading"><div class="ai-plan-spinner" aria-hidden="true"></div><p>AI 正在理解目标、分析依赖，并拆分为可执行的小任务。<br>通常需要 10–60 秒，请耐心等待。</p></div>
  </div>`;

  const previewHtml = () => {
    const milestones = breakdown.milestones;
    const totalTasks = milestones.reduce((sum, milestone) => sum + milestone.tasks.length, 0);
    return `<div class="ai-plan ai-plan--preview" data-ai-plan>
    <header>
      <small>AI BREAKDOWN PREVIEW</small>
      <h2>拆解预览</h2>
      <button type="button" data-ai-close aria-label="关闭">×</button>
    </header>
    ${breakdown.summary ? `<p class="ai-plan-summary">${escapePlanHtml(breakdown.summary)}</p>` : ''}
    ${breakdown.warnings?.length ? `<ul class="ai-plan-warnings">${breakdown.warnings.map(warning => `<li>⚠ ${escapePlanHtml(warning)}</li>`).join('')}</ul>` : ''}
    <p class="ai-plan-count">共 ${milestones.length} 个阶段 · ${totalTasks} 个任务。可以修改、删除或调整顺序，确认后才会写入。</p>
    <div class="ai-plan-milestones" data-ai-milestones>
      ${milestones.map((milestone, milestoneIndex) => `<section class="ai-milestone" data-milestone="${milestoneIndex}">
        <header>
          <input class="ai-milestone-title" value="${escapePlanHtml(milestone.title)}" maxlength="255" aria-label="阶段标题">
          <button type="button" data-milestone-delete title="删除该阶段">✕</button>
        </header>
        <input class="ai-milestone-desc" value="${escapePlanHtml(milestone.description || '')}" maxlength="5000" placeholder="阶段说明（可选）" aria-label="阶段说明">
        <ul>${milestone.tasks.map((draft, taskIndex) => `<li class="ai-task" data-task="${taskIndex}">
          <div class="ai-task-row">
            <input class="ai-task-title" value="${escapePlanHtml(draft.title)}" maxlength="255" aria-label="任务标题">
            <button type="button" data-task-delete title="删除该任务">✕</button>
          </div>
          <div class="ai-task-row ai-task-row--meta">
            <input class="ai-task-desc" value="${escapePlanHtml(draft.description || '')}" maxlength="5000" placeholder="说明" aria-label="任务说明">
            <label class="ai-task-minutes"><span>分钟</span><input type="number" min="1" max="100000" value="${draft.estimatedMinutes || ''}" data-field="estimatedMinutes" aria-label="预计分钟"></label>
            <label class="ai-task-priority"><span>优先级</span><select data-field="priority" aria-label="优先级">${Object.entries(TASK_PRIORITY).map(([value, item]) => `<option value="${value}"${(draft.priority || 'medium') === value ? ' selected' : ''}>${item.label}</option>`).join('')}</select></label>
            <button type="button" data-task-up title="上移">↑</button>
            <button type="button" data-task-down title="下移">↓</button>
          </div>
          <input class="ai-task-criteria" value="${escapePlanHtml(draft.acceptanceCriteria || '')}" maxlength="2000" placeholder="完成标准（可选）" aria-label="完成标准">
        </li>`).join('')}</ul>
      </section>`).join('')}
    </div>
    <footer class="ai-plan-footer">
      <button type="button" class="plan-ghost" data-ai-restart>重新填写</button>
      <button type="button" class="plan-primary" data-ai-apply>✓ 应用到计划</button>
    </footer>
  </div>`;
  };

  const render = (html) => {
    dialog.innerHTML = html;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-ai-close]')?.addEventListener('click', () => dialog.close());
  };

  // Sync DOM inputs back into the breakdown state before any structural change.
  const syncPreviewState = () => {
    if (!breakdown) return;
    dialog.querySelectorAll('[data-milestone]').forEach(section => {
      const milestone = breakdown.milestones[Number(section.dataset.milestone)];
      if (!milestone) return;
      const titleInput = section.querySelector('.ai-milestone-title');
      const descInput = section.querySelector('.ai-milestone-desc');
      if (titleInput) milestone.title = titleInput.value;
      if (descInput) milestone.description = descInput.value;
      section.querySelectorAll('[data-task]').forEach(li => {
        const draft = milestone.tasks[Number(li.dataset.task)];
        if (!draft) return;
        li.querySelector('.ai-task-title') && (draft.title = li.querySelector('.ai-task-title').value);
        li.querySelector('.ai-task-desc') && (draft.description = li.querySelector('.ai-task-desc').value);
        li.querySelector('.ai-task-criteria') && (draft.acceptanceCriteria = li.querySelector('.ai-task-criteria').value);
        const minutes = li.querySelector('[data-field="estimatedMinutes"]');
        if (minutes) draft.estimatedMinutes = minutes.value ? Number(minutes.value) : undefined;
        const priority = li.querySelector('[data-field="priority"]');
        if (priority) draft.priority = priority.value;
      });
    });
  };

  const rerenderPreview = () => {
    breakdown.milestones = breakdown.milestones
      .map(milestone => ({ ...milestone, tasks: milestone.tasks.filter(draft => draft.title.trim()) }))
      .filter(milestone => milestone.title.trim() && milestone.tasks.length);
    if (!breakdown.milestones.length) { showToast('所有阶段都被删掉了，请重新拆解'); render(collectFormHtml()); bindCollect(); return; }
    render(previewHtml());
    bindPreview();
  };

  const bindPreview = () => {
    dialog.querySelector('[data-ai-restart]').onclick = () => { render(collectFormHtml()); bindCollect(); };
    dialog.querySelector('[data-ai-apply]').onclick = async event => {
      syncPreviewState();
      const button = event.currentTarget;
      button.disabled = true; button.textContent = '正在写入…';
      try {
        const milestones = breakdown.milestones
          .filter(milestone => milestone.title.trim())
          .map(milestone => ({
            title: milestone.title.trim(),
            description: milestone.description?.trim() || undefined,
            tasks: milestone.tasks.filter(draft => draft.title.trim()).map(draft => ({
              title: draft.title.trim(),
              description: draft.description?.trim() || undefined,
              estimatedMinutes: draft.estimatedMinutes || undefined,
              priority: (draft.priority || 'medium').toUpperCase(),
              acceptanceCriteria: draft.acceptanceCriteria?.trim() || undefined,
            })),
          }))
          .filter(milestone => milestone.tasks.length);
        if (!milestones.length) { showToast('没有可应用的任务'); button.disabled = false; button.textContent = '✓ 应用到计划'; return; }
        const result = await aiApplyBreakdown({
          planId: plan.id,
          ...(isTaskMode ? { parentTaskId: task.id } : {}),
          milestones,
        });
        dialog.close();
        const count = result.appliedTaskIds?.length ?? 0;
        await onApplied?.(`AI 拆解已应用，新增 ${count} 个任务`);
      } catch (error) {
        showToast(error.message);
        button.disabled = false; button.textContent = '✓ 应用到计划';
      }
    };
    dialog.querySelectorAll('[data-milestone-delete]').forEach(button => button.onclick = () => {
      syncPreviewState();
      const index = Number(button.closest('[data-milestone]').dataset.milestone);
      breakdown.milestones.splice(index, 1);
      rerenderPreview();
    });
    dialog.querySelectorAll('[data-task-delete]').forEach(button => button.onclick = () => {
      syncPreviewState();
      const section = button.closest('[data-milestone]');
      const milestone = breakdown.milestones[Number(section.dataset.milestone)];
      milestone.tasks.splice(Number(button.closest('[data-task]').dataset.task), 1);
      rerenderPreview();
    });
    dialog.querySelectorAll('[data-task-up],[data-task-down]').forEach(button => button.onclick = () => {
      syncPreviewState();
      const section = button.closest('[data-milestone]');
      const milestone = breakdown.milestones[Number(section.dataset.milestone)];
      const index = Number(button.closest('[data-task]').dataset.task);
      const target = index + (button.dataset.taskUp !== undefined ? -1 : 1);
      if (target < 0 || target >= milestone.tasks.length) return;
      [milestone.tasks[index], milestone.tasks[target]] = [milestone.tasks[target], milestone.tasks[index]];
      rerenderPreview();
    });
  };

  const bindCollect = () => {
    const form = dialog.querySelector('[data-ai-form]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(form);
      const runButton = form.querySelector('.ai-run');
      runButton.disabled = true;
      render(loadingHtml());
      try {
        breakdown = isTaskMode
          ? await aiBreakdownTask({
              planId: plan.id,
              taskId: task.id,
              instruction: String(data.get('instruction') || '').trim() || undefined,
            })
          : await aiBreakdown({
              planId: plan.id,
              goal: String(data.get('goal') || '').trim(),
              goalDescription: String(data.get('goalDescription') || '').trim() || undefined,
              dueDate: String(data.get('dueDate') || '') || undefined,
              currentState: String(data.get('currentState') || '').trim() || undefined,
              availableTime: String(data.get('availableTime') || '').trim() || undefined,
              constraints: String(data.get('constraints') || '').trim() || undefined,
              resources: String(data.get('resources') || '').trim() || undefined,
            });
        render(previewHtml());
        bindPreview();
      } catch (error) {
        showToast(error.message || 'AI 拆解失败，原计划数据未受影响');
        render(collectFormHtml());
        bindCollect();
      }
    });
  };

  render(collectFormHtml());
  bindCollect();
}

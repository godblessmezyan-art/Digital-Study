export const escapePlanHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export const PLAN_STATUS = {
  draft: { label: '草稿', className: 'is-draft' },
  active: { label: '进行中', className: 'is-active' },
  completed: { label: '已完成', className: 'is-completed' },
  archived: { label: '已归档', className: 'is-archived' },
};

export const TASK_STATUS = {
  pending: { label: '待开始', icon: '○' },
  in_progress: { label: '进行中', icon: '◐' },
  completed: { label: '已完成', icon: '●' },
  cancelled: { label: '已取消', icon: '✕' },
};

export const TASK_PRIORITY = {
  low: { label: '低', className: 'prio-low' },
  medium: { label: '中', className: 'prio-medium' },
  high: { label: '高', className: 'prio-high' },
};

export const statusLabel = status => PLAN_STATUS[status]?.label || status;

export function dueLabel(dueDate) {
  if (!dueDate) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return `<span class="plan-due is-overdue">已逾期 ${-days} 天</span>`;
  if (days === 0) return '<span class="plan-due is-today">今天截止</span>';
  if (days <= 7) return `<span class="plan-due is-near">还剩 ${days} 天</span>`;
  return `<span class="plan-due">${dueDate}</span>`;
}

export function PlanHero(plans) {
  const active = plans.filter(plan => plan.status === 'active');
  const completed = plans.filter(plan => plan.status === 'completed');
  return `<header class="plans-hero">
    <div class="plans-title-block"><small>EXPEDITION PLANS</small><h1>计划</h1><p>“把遥远的目标，拆成今天可以出发的一步。”</p></div>
    <div class="plans-stats" aria-label="计划统计"><span><b>${active.length}</b><small>进行中</small></span><span><b>${plans.length}</b><small>全部</small></span><span><b>${completed.length}</b><small>已完成</small></span></div>
    <a class="plans-new" href="plans/new">＋ 新计划</a>
  </header>`;
}

export function PlanTodayCard(tasks) {
  if (!tasks.length) {
    return `<section class="plans-today plans-today--empty"><div><small>TODAY</small><strong>今天没有到期任务</strong></div><p>可以从容推进手头的阶段，或去计划里安排下一步。</p></section>`;
  }
  return `<section class="plans-today">
    <div><small>TODAY · 今日任务</small><strong>${tasks.length} 件事在等你</strong></div>
    <ul>${tasks.slice(0, 6).map(task => `<li>
      <a href="plans/${encodeURIComponent(task.planId)}" data-today-task="${escapePlanHtml(task.id)}">
        <span class="today-status" aria-hidden="true">${TASK_STATUS[task.status]?.icon || '○'}</span>
        <span class="today-title">${escapePlanHtml(task.title)}</span>
        ${task.estimatedMinutes ? `<small class="today-minutes">${task.estimatedMinutes} 分钟</small>` : ''}
        ${task.dueDate ? `<small class="today-due">${task.dueDate.slice(5)}</small>` : ''}
      </a>
    </li>`).join('')}</ul>
  </section>`;
}

export function PlanCard(plan) {
  const status = PLAN_STATUS[plan.status] || PLAN_STATUS.draft;
  return `<a class="plan-card ${status.className}" href="plans/${encodeURIComponent(plan.id)}">
    <header><h3>${escapePlanHtml(plan.title)}</h3><span class="plan-status">${status.label}</span></header>
    ${plan.description ? `<p>${escapePlanHtml(plan.description.slice(0, 80))}${plan.description.length > 80 ? '…' : ''}</p>` : ''}
    <div class="plan-progress" role="img" aria-label="进度 ${plan.progress}%"><i style="width:${plan.progress}%"></i></div>
    <footer>
      <span class="plan-count"><b>${plan.completedTasks}</b> / ${plan.totalTasks} 任务</span>
      <span class="plan-pct">${plan.progress}%</span>
      ${plan.dueDate ? dueLabel(plan.dueDate) : ''}
    </footer>
    ${plan.nextTask ? `<div class="plan-next"><small>下一步</small><span>${escapePlanHtml(plan.nextTask.title)}</span></div>` : ''}
  </a>`;
}

export function PlanEmptyState({ authenticated = true } = {}) {
  return `<section class="plans-empty"><span aria-hidden="true">✦</span><h2>${authenticated ? '还没有任何计划' : '登录后开始你的远征'}</h2><p>${authenticated ? '一个目标、一次拆解、一小步执行——计划从这里开始。' : '计划、任务与 AI 拆解都保存在你的账号之下。'}</p>${authenticated ? '<a href="plans/new">创建第一个计划</a>' : '<a href="#" data-plans-login>登录账号</a>'}</section>`;
}

export function PlanSkeleton() {
  return '<section class="plans-page"><div class="plans-skeleton"><i></i><i></i><i></i><i></i></div></section>';
}

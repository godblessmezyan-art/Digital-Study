import { getStoredUser } from './auth-client.js';
import { createPlan, listPlans, listTodayTasks } from './plans-client.js';
import { escapePlanHtml, PlanCard, PlanEmptyState, PlanHero, PlanSkeleton, PlanTodayCard, statusLabel } from './plan-components.js';
import { PlanDetailPage } from './plan-detail.js';

function plansRoute() {
  const match = location.pathname.match(/\/plans(?:\/([^/?#]+))?\/?$/);
  return match ? { first: match[1] ? decodeURIComponent(match[1]) : '' } : { first: '' };
}

export async function PlansListPage(root, { showToast, openLogin }) {
  root.innerHTML = PlanSkeleton();
  if (!getStoredUser()) {
    root.innerHTML = `<section class="plans-page">${PlanEmptyState({ authenticated: false })}</section>`;
    root.querySelector('[data-plans-login]')?.addEventListener('click', event => { event.preventDefault(); openLogin(); });
    return;
  }
  try {
    const [plans, todayTasks] = await Promise.all([listPlans(), listTodayTasks().catch(() => [])]);
    const groups = [
      { key: 'active', label: '进行中', plans: plans.filter(plan => plan.status === 'active') },
      { key: 'draft', label: '草稿', plans: plans.filter(plan => plan.status === 'draft') },
      { key: 'completed', label: '已完成', plans: plans.filter(plan => plan.status === 'completed') },
      { key: 'archived', label: '已归档', plans: plans.filter(plan => plan.status === 'archived') },
    ];
    root.innerHTML = `<section class="plans-page">
      ${PlanHero(plans)}
      ${PlanTodayCard(todayTasks)}
      ${plans.length ? groups.filter(group => group.plans.length).map(group => `
        <section class="plans-group" data-group="${group.key}">
          <header><h2>${group.label}</h2><small>${group.plans.length} 个计划</small></header>
          <div class="plans-grid">${group.plans.map(plan => PlanCard(plan)).join('')}</div>
        </section>`).join('') : PlanEmptyState({ authenticated: true })}
    </section>`;
  } catch (error) {
    root.innerHTML = `<section class="plans-page"><div class="plans-error"><span>航线暂时无法展开</span><p>${escapePlanHtml(error.message)}</p><button type="button">重新尝试</button></div></section>`;
    root.querySelector('button').onclick = () => PlansListPage(root, { showToast, openLogin });
  }
}

export async function PlanNewPage(root, { showToast }) {
  root.innerHTML = `<section class="plans-page plan-new-page">
    <header class="plan-form-head"><a href="plans">← 返回远征计划</a><small>NEW EXPEDITION</small><span></span></header>
    <form class="plan-form" data-plan-form>
      <h1>开启一个新计划</h1>
      <label><span>计划标题 *</span><input name="title" maxlength="255" required placeholder="例如：3 个月内雅思从 5.0 提升到 6.0"></label>
      <label><span>目标说明</span><textarea name="description" maxlength="5000" rows="4" placeholder="为什么做这个计划？做到什么程度算成功？"></textarea></label>
      <div class="plan-form-row">
        <label><span>开始日期</span><input name="startDate" type="date"></label>
        <label><span>截止日期</span><input name="dueDate" type="date"></label>
        <label><span>状态</span><select name="status"><option value="DRAFT">草稿</option><option value="ACTIVE" selected>进行中</option></select></label>
      </div>
      <footer><button type="button" class="plan-ghost" data-plan-cancel>取消</button><button type="submit" class="plan-primary">创建计划</button></footer>
      <p class="plan-form-hint">创建后可以手动添加任务，也可以用「AI 帮我拆解」把目标变成一组可执行的小任务。</p>
    </form>
  </section>`;
  const form = root.querySelector('[data-plan-form]');
  form.querySelector('[data-plan-cancel]').onclick = () => { location.href = 'plans'; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const input = {
      title: String(data.get('title') || '').trim(),
      description: String(data.get('description') || '').trim(),
      status: String(data.get('status') || 'DRAFT'),
      startDate: String(data.get('startDate') || '') || undefined,
      dueDate: String(data.get('dueDate') || '') || undefined,
    };
    if (!input.title) { showToast('请填写计划标题'); return; }
    const button = form.querySelector('[type="submit"]');
    button.disabled = true; button.textContent = '正在创建…';
    try {
      const plan = await createPlan(input);
      location.href = `plans/${encodeURIComponent(plan.id)}`;
    } catch (error) {
      showToast(error.message);
      button.disabled = false; button.textContent = '创建计划';
    }
  });
}

export function createPlansPage(root, options) {
  window.__plansCleanup?.(); window.__plansCleanup = null;
  if (!getStoredUser()) return PlansListPage(root, options);
  const route = plansRoute();
  if (route.first === 'new') return PlanNewPage(root, options);
  if (route.first) return PlanDetailPage(root, { ...options, id: route.first });
  return PlansListPage(root, options);
}

export { statusLabel };

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');

export class SceneTransitionManager {
  constructor() {
    this.timer = 0;
    this.running = false;
    this.root = document.createElement('div');
    this.root.className = 'scene-transition-overlay';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = '<span class="scene-transition-cloud scene-transition-cloud--a"></span><span class="scene-transition-cloud scene-transition-cloud--b"></span><span class="scene-transition-veil"></span><small></small>';
    document.body.append(this.root);
  }

  async transition({ type = 'default', targetName = '', swap }) {
    if (this.running) return;
    const simple = reducedQuery.matches || document.documentElement.dataset.motionLevel === 'low';
    if (simple) { await swap?.(); return; }
    this.running = true;
    this.root.dataset.type = ['cloud', 'interior', 'default'].includes(type) ? type : 'default';
    this.root.querySelector('small').textContent = targetName ? `正在前往 · ${targetName}` : '';
    document.body.classList.add('is-scene-transitioning');
    this.root.classList.add('is-entering');
    await new Promise(resolve => setTimeout(resolve, type === 'cloud' ? 260 : 190));
    await swap?.();
    this.root.classList.add('is-leaving');
    await new Promise(resolve => { this.timer = setTimeout(resolve, type === 'cloud' ? 520 : 380); });
    this.root.classList.remove('is-entering', 'is-leaving');
    document.body.classList.remove('is-scene-transitioning');
    this.running = false;
  }

  destroy() {
    clearTimeout(this.timer);
    this.root.remove();
    document.body.classList.remove('is-scene-transitioning');
    this.running = false;
    if (window.cloudRealmSceneTransition === this) delete window.cloudRealmSceneTransition;
  }
}

export function createSceneTransitionManager() {
  if (window.cloudRealmSceneTransition) return window.cloudRealmSceneTransition;
  window.cloudRealmSceneTransition = new SceneTransitionManager();
  return window.cloudRealmSceneTransition;
}

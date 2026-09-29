const STORAGE_KEY = 'cloud-realm-world-v1';

const WEATHER = {
  clear: { label: '晴朗', icon: '☀' },
  cloudy: { label: '多云', icon: '☁' },
  rain: { label: '雨', icon: '☂' },
  snow: { label: '雪', icon: '❄' },
};

const PERIODS = {
  dawn: { label: '清晨', hours: [5, 9] },
  day: { label: '白昼', hours: [9, 17] },
  dusk: { label: '黄昏', hours: [17, 21] },
  night: { label: '深夜', hours: [21, 5] },
};

const DEFAULT_STATE = {
  enabled: true,
  weather: 'clear',
  intensity: 'low',
  autoWeather: false,
  timeMode: 'local',
  period: 'day',
  focus: false,
  muted: true,
  volume: 0.26,
  motionLevel: 'normal',
  sounds: { wind: true, rain: true },
};

// Scene contracts deliberately separate atmosphere strength from future art variants.
// `backgrounds` is reserved for real dawn/day/dusk/night imagery when those assets exist.
export const WORLD_SCENES = {
  home: { kind: 'outdoor', weatherMode: 'full', strength: 1, backgrounds: null },
  terrace: { kind: 'outdoor', weatherMode: 'full', strength: 1, backgrounds: null },
  study: { kind: 'indoor', weatherMode: 'edge', strength: 0.48, backgrounds: null },
  shelf: { kind: 'indoor', weatherMode: 'edge', strength: 0.36, backgrounds: null },
  categories: { kind: 'indoor', weatherMode: 'edge', strength: 0.42, backgrounds: null },
  content: { kind: 'indoor', weatherMode: 'edge', strength: 0.3, backgrounds: null },
  studio: { kind: 'indoor', weatherMode: 'edge', strength: 0.22, quiet: true, backgrounds: null },
  reading: { kind: 'indoor', weatherMode: 'edge', strength: 0.18, quiet: true, backgrounds: null },
  journal: { kind: 'indoor', weatherMode: 'edge', strength: 0.2, quiet: true, backgrounds: null },
};

const DEFAULT_SCENE = { kind: 'indoor', weatherMode: 'none', strength: .16, quiet: true, backgrounds: null };

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_STATE, ...saved, sounds: { ...DEFAULT_STATE.sounds, ...saved.sounds } };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function localPeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

class AmbientAudio {
  constructor(getState) {
    this.getState = getState;
    this.context = null;
    this.master = null;
    this.tracks = {};
  }

  async ensure() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
      this.tracks.wind = this.createNoiseTrack('lowpass', 720);
      this.tracks.rain = this.createNoiseTrack('highpass', 1450);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return true;
  }

  createNoiseTrack(filterType, frequency) {
    const frames = this.context.sampleRate * 3;
    const buffer = this.context.createBuffer(1, frames, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < frames; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * .985 + white * .015;
      data[index] = filterType === 'lowpass' ? last * 3.2 : white * .42;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = filterType;
    filter.frequency.value = frequency;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    return { source, gain };
  }

  async sync(fromGesture = false) {
    const state = this.getState();
    if (fromGesture && !state.muted) await this.ensure();
    if (!this.context) return;
    const now = this.context.currentTime;
    const overall = state.enabled && !state.muted ? state.volume * (state.focus ? .38 : 1) : 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(overall, now, .32);
    const rainActive = state.sounds.rain && state.weather === 'rain';
    const levels = { wind: state.sounds.wind ? .42 : 0, rain: rainActive ? .7 : 0 };
    Object.entries(levels).forEach(([name, level]) => {
      this.tracks[name].gain.gain.cancelScheduledValues(now);
      this.tracks[name].gain.gain.setTargetAtTime(level, now, .45);
    });
  }
}

class WeatherCanvas {
  constructor(canvas, getContext) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.getContext = getContext;
    this.particles = [];
    this.frame = null;
    this.last = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize = this.resize.bind(this);
    this.draw = this.draw.bind(this);
    addEventListener('resize', this.resize, { passive: true });
    document.addEventListener('visibilitychange', () => this.sync());
    this.resize();
  }

  resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(innerWidth * ratio);
    this.canvas.height = Math.round(innerHeight * ratio);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.particles = [];
  }

  sync() {
    const { state, scene } = this.getContext();
    const active = state.enabled && !state.focus && scene.weatherMode !== 'none' && !this.reduced && !document.hidden && ['rain', 'snow'].includes(state.weather);
    if (active && !this.frame) this.frame = requestAnimationFrame(this.draw);
    if (!active && this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
      this.ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
  }

  reset() {
    this.particles = [];
    this.sync();
  }

  draw(time) {
    this.frame = null;
    const { state, scene } = this.getContext();
    if (!state.enabled || state.focus || document.hidden || this.reduced) return this.sync();
    const delta = Math.min(2, (time - this.last) / 16.67 || 1);
    this.last = time;
    const base = { low: 80, medium: 150, high: 260 }[state.intensity];
    const mobileFactor = innerWidth < 720 ? .56 : 1;
    const quietFactor = scene.quiet ? .78 : 1;
    const motionFactor = { low: .5, normal: 1, full: 1.16 }[state.motionLevel] || 1;
    // Scene strength controls subtlety through opacity. Applying it to both count
    // and opacity made quiet indoor routes effectively invisible at low intensity.
    const target = Math.round(base * mobileFactor * quietFactor * motionFactor);
    while (this.particles.length < target) this.particles.push(this.makeParticle(state.weather, true, state.intensity));
    if (this.particles.length > target) this.particles.length = target;
    this.ctx.clearRect(0, 0, innerWidth, innerHeight);
    const edge = scene.kind === 'indoor';
    this.particles.forEach((particle, index) => {
      const snowDrift = state.weather === 'snow' ? Math.sin(time * .001 * particle.sway + particle.phase) * particle.drift : 0;
      particle.x += (particle.vx + snowDrift) * delta;
      particle.y += particle.vy * delta;
      particle.rotation += particle.spin * delta;
      if (particle.y > innerHeight + 30 || particle.x > innerWidth + 40 || particle.x < -40) this.particles[index] = this.makeParticle(state.weather, false, state.intensity);
      const edgeDistance = Math.min(1, Math.abs(particle.x - innerWidth / 2) / (innerWidth / 2));
      const edgeAlpha = scene.weatherMode === 'none' ? 0 : edge ? Math.max(0, (edgeDistance - .38) / .62) : 1;
      const sceneAlpha = scene.kind === 'indoor' ? Math.min(.5, Math.max(.28, scene.strength)) : scene.strength;
      const alpha = particle.alpha * Math.min(1, edgeAlpha) * sceneAlpha;
      if (state.weather === 'rain') {
        this.ctx.strokeStyle = `rgba(199,224,238,${alpha})`;
        this.ctx.lineWidth = particle.size;
        this.ctx.beginPath();
        this.ctx.moveTo(particle.x, particle.y);
        this.ctx.lineTo(particle.x - 5, particle.y - particle.length);
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = `rgba(244,249,251,${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        if (particle.size > 3.35) {
          this.ctx.save();
          this.ctx.translate(particle.x, particle.y);
          this.ctx.rotate(particle.rotation);
          this.ctx.strokeStyle = `rgba(255,255,255,${Math.min(.9, alpha * 1.18)})`;
          this.ctx.lineWidth = Math.max(.55, particle.size * .16);
          for (let arm = 0; arm < 3; arm += 1) {
            this.ctx.rotate(Math.PI / 3);
            this.ctx.beginPath();
            this.ctx.moveTo(-particle.size * 1.45, 0);
            this.ctx.lineTo(particle.size * 1.45, 0);
            this.ctx.stroke();
          }
          this.ctx.restore();
        }
      }
    });
    this.frame = requestAnimationFrame(this.draw);
  }

  makeParticle(type, randomY, intensity = 'low') {
    const force = { low: 0, medium: 1, high: 2 }[intensity];
    return type === 'rain'
      ? {
          x: Math.random() * innerWidth,
          y: randomY ? Math.random() * innerHeight : -70,
          vx: 3.2 + force * 1.35 + Math.random() * 2.8,
          vy: 13 + force * 5 + Math.random() * (9 + force * 3),
          size: .75 + force * .22 + Math.random() * (.72 + force * .16),
          length: 18 + force * 10 + Math.random() * (20 + force * 9),
          alpha: .29 + force * .055 + Math.random() * (.25 + force * .04),
          rotation: 0,
          spin: 0,
        }
      : {
          x: Math.random() * innerWidth,
          y: randomY ? Math.random() * innerHeight : -22,
          vx: -.12 + Math.random() * .58,
          vy: .58 + force * .18 + Math.random() * (1 + force * .25),
          size: 1.7 + force * .48 + Math.random() * (3 + force * .62),
          alpha: .42 + force * .06 + Math.random() * (.38 + force * .04),
          phase: Math.random() * Math.PI * 2,
          sway: .65 + Math.random() * 1.35,
          drift: .32 + force * .18 + Math.random() * .58,
          rotation: Math.random() * Math.PI,
          spin: (-.012 + Math.random() * .024) * (1 + force * .22),
        };
  }
}

class WorldController {
  constructor({ mount, scene = 'home' }) {
    this.state = loadState();
    this.sceneId = scene;
    this.returnFocus = null;
    this.autoTimer = null;
    this.clockTimer = null;
    this.root = document.createElement('div');
    this.root.className = 'world-system';
    this.root.innerHTML = this.template();
    document.body.append(this.root);
    this.button = this.createEntry();
    mount.append(this.button);
    this.audio = new AmbientAudio(() => this.state);
    this.weatherCanvas = new WeatherCanvas(this.root.querySelector('canvas'), () => ({ state: this.state, scene: this.scene }));
    this.bind();
    this.apply();
    this.clockTimer = setInterval(() => this.renderStatus(), 30_000);
  }

  get scene() { return WORLD_SCENES[this.sceneId] || DEFAULT_SCENE; }

  createEntry() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'world-entry';
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = '<span class="world-entry__orb" aria-hidden="true">✦</span><span><small id="world-entry-time"></small><strong id="world-entry-weather"></strong></span>';
    return button;
  }

  template() {
    return `<div class="world-tint" aria-hidden="true"></div><canvas class="world-weather" aria-hidden="true"></canvas>
      <aside class="world-panel" role="dialog" aria-modal="true" aria-labelledby="world-panel-title" aria-hidden="true">
        <button class="world-panel__backdrop" type="button" data-world-close aria-label="关闭世界面板"></button>
        <section class="world-panel__card">
          <header><span><small>CLOUD REALM · LIVING WORLD</small><h2 id="world-panel-title">世界氛围</h2><p id="world-panel-summary"></p></span><button type="button" class="world-panel__close" data-world-close aria-label="关闭">×</button></header>
          <div class="world-panel__body">
            <section class="world-control-section"><div class="world-section-title"><span><b>天气</b><small>窗外的云层与风物</small></span><label class="world-switch">自动天气<input type="checkbox" data-world-field="autoWeather"><i></i></label></div>
              <div class="world-segment" data-world-options="weather">${Object.entries(WEATHER).map(([id, item]) => `<button type="button" data-value="${id}"><i>${item.icon}</i>${item.label}</button>`).join('')}</div>
              <div class="world-inline"><span>强度</span><div class="world-mini-segment" data-world-options="intensity"><button type="button" data-value="low">低</button><button type="button" data-value="medium">中</button><button type="button" data-value="high">高</button></div></div>
            </section>
            <section class="world-control-section"><div class="world-section-title"><span><b>时间</b><small>只调整背景色温，不压暗正文</small></span><label class="world-switch">跟随本地<input type="checkbox" data-world-field="localTime"><i></i></label></div>
              <div class="world-segment world-segment--time" data-world-options="period">${Object.entries(PERIODS).map(([id, item]) => `<button type="button" data-value="${id}">${item.label}</button>`).join('')}</div>
            </section>
            <section class="world-control-section"><div class="world-section-title"><span><b>环境音</b><small>切换时会柔和淡入淡出</small></span><button type="button" class="world-mute" data-world-mute></button></div>
              <label class="world-volume"><span>总音量</span><input type="range" min="0" max="1" step="0.01" data-world-volume><output></output></label>
              <div class="world-sounds"><label><input type="checkbox" data-sound="wind"><span>风声<small>程序化音景</small></span></label><label><input type="checkbox" data-sound="rain"><span>雨声<small>雨天自动融入</small></span></label><label class="is-disabled" title="等待本地音频素材"><input type="checkbox" disabled><span>壁炉声<small>暂无合适素材</small></span></label></div>
            </section>
            <section class="world-control-section"><div class="world-section-title"><span><b>一键预设</b><small>不会擅自解除静音</small></span></div><div class="world-presets"><button type="button" data-preset="rain">雨夜阅读<small>深夜 · 低雨</small></button><button type="button" data-preset="clear">晴日云游<small>白昼 · 晴朗</small></button><button type="button" data-preset="snow">静雪独处<small>黄昏 · 低雪</small></button></div></section>
            <section class="world-control-section"><div class="world-section-title"><span><b>动态效果</b><small>按设备与偏好控制世界运动</small></span></div><div class="world-mini-segment world-motion-level" data-world-options="motionLevel"><button type="button" data-value="low">低</button><button type="button" data-value="normal">标准</button><button type="button" data-value="full">完整</button></div></section>
          </div>
          <footer><button type="button" data-world-focus></button><button type="button" data-world-enabled></button><button type="button" data-world-reset>恢复默认</button></footer>
        </section>
      </aside>`;
  }

  bind() {
    this.button.addEventListener('click', () => this.open());
    this.root.querySelectorAll('[data-world-close]').forEach(button => button.addEventListener('click', () => this.close()));
    this.root.querySelectorAll('[data-world-options]').forEach(group => group.addEventListener('click', event => {
      const option = event.target.closest('[data-value]');
      if (!option) return;
      const field = group.dataset.worldOptions;
      this.update({ [field]: option.dataset.value, ...(field === 'period' ? { timeMode: 'fixed' } : {}) }, true);
    }));
    this.root.querySelector('[data-world-field="autoWeather"]').addEventListener('change', event => this.update({ autoWeather: event.target.checked }, true));
    this.root.querySelector('[data-world-field="localTime"]').addEventListener('change', event => this.update({ timeMode: event.target.checked ? 'local' : 'fixed' }, true));
    this.root.querySelector('[data-world-volume]').addEventListener('input', event => this.update({ volume: Number(event.target.value) }, true));
    this.root.querySelector('[data-world-mute]').addEventListener('click', () => this.update({ muted: !this.state.muted }, true));
    this.root.querySelectorAll('[data-sound]').forEach(input => input.addEventListener('change', event => this.update({ sounds: { ...this.state.sounds, [input.dataset.sound]: event.target.checked } }, true)));
    this.root.querySelector('[data-world-focus]').addEventListener('click', () => this.update({ focus: !this.state.focus }, true));
    this.root.querySelector('[data-world-enabled]').addEventListener('click', () => this.update({ enabled: !this.state.enabled }, true));
    this.root.querySelector('[data-world-reset]').addEventListener('click', () => { this.state = structuredClone(DEFAULT_STATE); this.apply(true); });
    this.root.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
      const preset = {
        rain: { weather: 'rain', intensity: 'low', timeMode: 'fixed', period: 'night' },
        clear: { weather: 'clear', intensity: 'low', timeMode: 'fixed', period: 'day' },
        snow: { weather: 'snow', intensity: 'low', timeMode: 'fixed', period: 'dusk' },
      }[button.dataset.preset];
      this.update(preset, true);
    }));
    document.addEventListener('keydown', event => {
      if (!this.isOpen()) return;
      if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...this.root.querySelectorAll('.world-panel button:not([disabled]),.world-panel input:not([disabled])')].filter(item => item.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  update(patch, fromGesture = false) {
    this.state = { ...this.state, ...patch };
    this.apply(fromGesture);
  }

  apply(fromGesture = false) {
    const effectivePeriod = this.state.timeMode === 'local' ? localPeriod() : this.state.period;
    document.documentElement.dataset.worldTime = effectivePeriod;
    document.documentElement.dataset.worldWeather = this.state.weather;
    document.documentElement.dataset.worldScene = this.scene.kind;
    document.documentElement.dataset.worldEnabled = String(this.state.enabled);
    document.documentElement.dataset.worldFocus = String(this.state.focus);
    document.documentElement.dataset.worldAutoWeather = String(this.state.autoWeather);
    document.documentElement.dataset.motionLevel = this.state.motionLevel;
    document.documentElement.style.setProperty('--world-strength', this.scene.strength);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.renderPanel();
    this.renderStatus();
    this.syncAutoWeather();
    this.weatherCanvas.reset();
    void this.audio.sync(fromGesture);
    window.dispatchEvent(new CustomEvent('worldchange', { detail: { ...this.state, effectivePeriod, scene: this.sceneId } }));
  }

  renderStatus() {
    const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    this.button.querySelector('#world-entry-time').textContent = time;
    this.button.querySelector('#world-entry-weather').textContent = this.state.enabled ? `${WEATHER[this.state.weather].icon} ${WEATHER[this.state.weather].label}` : '氛围已关闭';
    const period = this.state.timeMode === 'local' ? localPeriod() : this.state.period;
    const motionNote = this.weatherCanvas?.reduced ? ' · 系统已减少动态' : '';
    this.root.querySelector('#world-panel-summary').textContent = `${PERIODS[period].label} · ${WEATHER[this.state.weather].label} · ${this.scene.kind === 'outdoor' ? '室外' : '室内窗景'}${motionNote}`;
    if (this.state.timeMode === 'local') document.documentElement.dataset.worldTime = period;
  }

  renderPanel() {
    this.root.querySelectorAll('[data-world-options]').forEach(group => group.querySelectorAll('[data-value]').forEach(button => {
      const selected = button.dataset.value === this.state[group.dataset.worldOptions];
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }));
    const auto = this.root.querySelector('[data-world-field="autoWeather"]');
    auto.checked = this.state.autoWeather;
    const local = this.root.querySelector('[data-world-field="localTime"]');
    local.checked = this.state.timeMode === 'local';
    this.root.querySelector('[data-world-options="period"]').classList.toggle('is-disabled', local.checked);
    this.root.querySelector('[data-world-volume]').value = this.state.volume;
    this.root.querySelector('.world-volume output').textContent = `${Math.round(this.state.volume * 100)}%`;
    this.root.querySelectorAll('[data-sound]').forEach(input => { input.checked = this.state.sounds[input.dataset.sound]; });
    const mute = this.root.querySelector('[data-world-mute]');
    mute.textContent = this.state.muted ? '静音中 · 点击开启' : '声音已开启';
    mute.setAttribute('aria-pressed', String(this.state.muted));
    const focus = this.root.querySelector('[data-world-focus]');
    focus.textContent = this.state.focus ? '退出专注模式' : '进入专注模式';
    focus.classList.toggle('is-selected', this.state.focus);
    focus.setAttribute('aria-pressed', String(this.state.focus));
    const enabled = this.root.querySelector('[data-world-enabled]');
    enabled.textContent = this.state.enabled ? '关闭全部氛围' : '开启全部氛围';
    enabled.setAttribute('aria-pressed', String(!this.state.enabled));
  }

  syncAutoWeather() {
    clearInterval(this.autoTimer);
    if (!this.state.autoWeather) return;
    this.autoTimer = setInterval(() => {
      const choices = Object.keys(WEATHER).filter(item => item !== this.state.weather);
      this.update({ weather: choices[Math.floor(Math.random() * choices.length)] });
    }, 7 * 60 * 1000);
  }

  setScene(sceneId) {
    this.sceneId = WORLD_SCENES[sceneId] ? sceneId : 'study';
    this.apply();
  }

  isOpen() { return this.root.querySelector('.world-panel').classList.contains('is-open'); }
  snapshot() {
    return {
      ...this.state,
      effectivePeriod: this.state.timeMode === 'local' ? localPeriod() : this.state.period,
      scene: this.sceneId,
    };
  }
  open() {
    this.returnFocus = document.activeElement;
    const panel = this.root.querySelector('.world-panel');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-world-panel-open');
    setTimeout(() => panel.querySelector('.world-panel__close').focus(), 40);
  }
  close() {
    const panel = this.root.querySelector('.world-panel');
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-world-panel-open');
    this.returnFocus?.focus({ preventScroll: true });
  }
}

export function initWorld(options) {
  if (window.cloudRealmWorld) return window.cloudRealmWorld;
  window.cloudRealmWorld = new WorldController(options);
  return window.cloudRealmWorld;
}

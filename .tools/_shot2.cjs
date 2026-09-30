const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const token = process.env.STUDY_TOKEN;
  const user = JSON.stringify({ username: 'weixi', displayName: 'weixi', avatarUrl: null, avatarVersion: 0 });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 150)));

  await page.goto('https://wxhappylife.top/digital-study/index.html', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate((tk, us) => {
    localStorage.setItem('study_token', tk);
    localStorage.setItem('study_user', us);
  }, token, user);

  // 1. Echoes workspace
  await page.goto('https://wxhappylife.top/digital-study/index.html#curator', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));
  const ws = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      hero: /ECHOES OF THE ARCHIVE/.test(t),
      desc: t.includes('向埃瑟瑞恩中留下的知识'),
      sessions: !!document.querySelector('[data-new-session]'),
      composer: !!document.querySelector('[data-echo-input]'),
      inscriptionSelect: document.querySelectorAll('[data-echo-inscription] option').length,
      modelSelect: !!document.querySelector('[data-echo-model]'),
      contextChips: [...document.querySelectorAll('.echoes-context-chip')].map(c => c.textContent.trim()),
      sendBtn: !!document.querySelector('[data-echo-send]'),
      suggestions: document.querySelectorAll('[data-suggestion]').length,
    };
  });
  console.log('WORKSPACE:', JSON.stringify(ws, null, 1));
  await page.screenshot({ path: 'c:/Users/Administrator/Documents/echoes-workspace.png' });

  // 2. Global panel via HUD ✦
  const hasHudBtn = await page.evaluate(() => !!document.querySelector('#appEchoButton'));
  await page.evaluate(() => document.querySelector('#appEchoButton')?.click());
  await new Promise(r => setTimeout(r, 1200));
  const panel = await page.evaluate(() => {
    const overlay = document.querySelector('.ai-panel-overlay');
    return {
      hudBtn: !!document.querySelector('#appEchoButton'),
      open: overlay && !overlay.hidden,
      title: overlay?.querySelector('h2')?.textContent || '',
      contextChips: [...(overlay?.querySelectorAll('.ai-panel-chip') || [])].map(c => c.textContent.trim()),
      actions: [...(overlay?.querySelectorAll('[data-panel-action]') || [])].map(b => b.textContent.trim()),
      hasSend: !!overlay?.querySelector('[data-panel-send]'),
      hasExpand: !!overlay?.querySelector('[data-panel-expand]'),
    };
  });
  console.log('GLOBAL_PANEL:', JSON.stringify({ hasHudBtn, ...panel }, null, 1));
  await page.screenshot({ path: 'c:/Users/Administrator/Documents/ai-panel.png' });

  // 3. Ctrl+E on plans page (context awareness)
  await page.goto('https://wxhappylife.top/digital-study/plans', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3500));
  await page.keyboard.down('Control'); await page.keyboard.press('KeyE'); await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 1200));
  const plansPanel = await page.evaluate(() => {
    const overlay = document.querySelector('.ai-panel-overlay');
    return {
      open: overlay && !overlay.hidden,
      chips: [...(overlay?.querySelectorAll('.ai-panel-chip') || [])].map(c => c.textContent.trim()),
      actions: [...(overlay?.querySelectorAll('[data-panel-action]') || [])].map(b => b.textContent.trim()),
    };
  });
  console.log('PLANS_PANEL:', JSON.stringify(plansPanel, null, 1));
  await page.screenshot({ path: 'c:/Users/Administrator/Documents/ai-panel-plans.png' });

  // 4. Inscription launch: pick a PROMPT id from API, open #curator?inscription=
  const launch = await page.evaluate(async (tk) => {
    const res = await fetch('/digital-study/api/curator/echoes/inscriptions', { headers: { Authorization: 'Bearer ' + tk } });
    const list = await res.json();
    return list.find(i => i.hasVariables) || list[0];
  }, token);
  console.log('LAUNCH_TARGET:', launch?.name, 'hasVariables:', launch?.hasVariables);
  await page.goto(`https://wxhappylife.top/digital-study/index.html#curator?inscription=${launch.id}`, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4500));
  const banner = await page.evaluate(() => {
    const b = document.querySelector('.echoes-inscription-banner');
    return {
      banner: !!b,
      name: b?.querySelector('h3')?.textContent || '',
      badge: b?.querySelector('.echoes-inscription-badge')?.textContent || '',
      variables: [...document.querySelectorAll('[data-variable]')].map(i => i.dataset.variable),
    };
  });
  console.log('INSCRIPTION_LAUNCH:', JSON.stringify(banner, null, 1));
  await page.screenshot({ path: 'c:/Users/Administrator/Documents/echoes-launch.png' });

  // 5. Inscriptions page launch button
  await page.goto('https://wxhappylife.top/digital-study/index.html#inscriptions', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 4000));
  const launchBtns = await page.evaluate(() => document.querySelectorAll('[data-action="launch"]').length);
  console.log('INSCRIPTIONS_LAUNCH_BUTTONS:', launchBtns);

  console.log('ERRORS:', JSON.stringify(errs.slice(0, 6)));
  await browser.close();
})();

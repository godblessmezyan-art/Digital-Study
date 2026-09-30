import type {
  GeneratedBook,
  GeneratedBookDesign,
  GeneratedContentBlock,
  GeneratedSection,
  GenerationInput,
} from './ai.types';

const THEME_OPTIONS = [
  ['theme-default', '✨ 本书之夜'], ['theme-mint', '🍃 薄荷'], ['theme-cloud', '☁️ 白云'],
  ['theme-bamboo', '🎋 青竹'], ['theme-amber', '🌾 麦浪'], ['theme-dawn', '🌅 晨光'],
  ['theme-lavender', '🪻 薰衣草'], ['theme-slate', '🪨 苔石'], ['theme-rose', '🌹 蔷薇'],
  ['theme-sakura', '🌸 樱花'], ['theme-forest', '🌲 森林'], ['theme-ocean', '🌊 海洋'],
  ['theme-sand', '🏜️ 沙丘'], ['theme-night', '🌙 夜晚'], ['theme-charcoal', '🖤 炭黑'],
  ['theme-deepsea', '🐋 深海'],
] as const;

const SIGNATURE_PALETTES: Record<GeneratedBookDesign['theme'], string> = {
  cosmic: '--bg:#151426;--text:#eee9f8;--text2:#aaa1bd;--card:#201d35;--border:#3b3554;--accent:#b59cff;--accent2:#dfb866;--accent3:#c67a8d;--soft:#292441;--gold:#dfb866;--hero-top:#0f0d1b;--hero-via:#17142a;--hero-bot:#242037;--quote-bg:#242039;--shadow:rgba(0,0,0,.42)',
  literary: '--bg:#f6f0e6;--text:#3d342c;--text2:#8e7f70;--card:#fffaf2;--border:#e3d5c3;--accent:#98613f;--accent2:#b18a49;--accent3:#657f78;--soft:#eee3d5;--gold:#c39a55;--hero-top:#f5eadc;--hero-via:#eee0d1;--hero-bot:#e5d5c7;--quote-bg:#f2e7da;--shadow:rgba(93,67,44,.16)',
  forest: '--bg:#17231c;--text:#e4ead9;--text2:#93a48f;--card:#1e2d23;--border:#2f4234;--accent:#8fbf6f;--accent2:#d3a94f;--accent3:#c07a58;--soft:#24352a;--gold:#d8b25e;--hero-top:#0f1a14;--hero-via:#16241b;--hero-bot:#1d2e22;--quote-bg:#213226;--shadow:rgba(0,0,0,.4)',
  ocean: '--bg:#14212b;--text:#e2e9ee;--text2:#8fa3b0;--card:#1b2b37;--border:#2c4252;--accent:#5fa8c9;--accent2:#d3a94f;--accent3:#c9806a;--soft:#203140;--gold:#d8b25e;--hero-top:#0e1a24;--hero-via:#14242f;--hero-bot:#1a2e3a;--quote-bg:#1d2e3b;--shadow:rgba(0,0,0,.42)',
  amber: '--bg:#fbf5e8;--text:#463a24;--text2:#97875f;--card:#fffaf0;--border:#e8dab5;--accent:#c08a2d;--accent2:#a76b2f;--accent3:#7d8a4a;--soft:#f5ecd6;--gold:#c08a2d;--hero-top:#faf1da;--hero-via:#f7ecd2;--hero-bot:#f3e6c6;--quote-bg:#f7efd9;--shadow:rgba(140,110,50,.16)',
  rose: '--bg:#fdf2f4;--text:#4a3238;--text2:#a3838b;--card:#fffafa;--border:#f0d8dd;--accent:#c25e75;--accent2:#a8769b;--accent3:#6f9b7f;--soft:#f9e8ec;--gold:#c39a55;--hero-top:#fbebee;--hero-via:#f9e6ea;--hero-bot:#f6e0e5;--quote-bg:#faedf0;--shadow:rgba(160,90,110,.14)',
  slate: '--bg:#eef1f0;--text:#35403d;--text2:#7e8b87;--card:#f9fbfa;--border:#d6dedb;--accent:#557d6e;--accent2:#7d8a9b;--accent3:#b08968;--soft:#e5eae8;--gold:#b3985a;--hero-top:#eaeef0;--hero-via:#e6ebe9;--hero-bot:#e2e8e5;--quote-bg:#e9eeec;--shadow:rgba(70,90,85,.14)',
};

export class GoodnightHtmlRenderer {
  render(book: GeneratedBook, input: GenerationInput): string {
    const title = this.escape(book.title || input.title);
    const author = this.escape(input.author || '作者待补充');
    const description = this.escape(book.summary);
    const design: GeneratedBookDesign = book.design ?? { theme: 'literary', motif: 'library', eyebrow: '深夜书房', subtitle: '今夜共读', heroQuote: '' };
    const sections = book.sections.map((section, index) => this.section(section, index)).join('\n');
    const tags = book.tags.slice(0, 8).map((tag) => `<span>${this.escape(tag)}</span>`).join('');
    const themes = THEME_OPTIONS.map(([value, label]) => `<option value="${value}">${label}</option>`).join('\n');
    const sourceNote = input.sourceText.trim()
      ? '根据用户提供资料整理；延伸实践已单独标注'
      : '基于可靠通用知识生成；发布前请核验关键事实与引文';

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="author" content="${author}">
  <meta name="description" content="${description}">
  <title>${title} · 晚安睡前阅读</title>
  <link rel="preconnect" href="https://fonts.loli.net" crossorigin>
  <link href="https://fonts.loli.net/css2?family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>${this.styles(SIGNATURE_PALETTES[design.theme])}</style>
</head>
<body class="theme-default">
  <script>(function(){var t=${JSON.stringify(THEME_OPTIONS.map(([value]) => value))};document.body.className=t[Math.floor(Math.random()*t.length)]})();</script>
  <select class="theme-select" aria-label="切换阅读主题" onchange="document.body.className=this.value">${themes}</select>
  <header class="goodnight-hero">
    <span class="series-tag">深 夜 书 房 · 今 夜 共 读</span>
    <div class="hero-layout">
      <div class="hero-copy">
        <small>${this.escape(design.eyebrow || 'GOODNIGHT READING')}</small>
        <h1>${title}</h1>
        <p class="hero-sub">${this.escape(design.subtitle || '在睡前，慢慢读懂一本书')}</p>
        ${design.heroQuote ? `<p class="hero-quote">${this.escape(design.heroQuote)}</p>` : ''}
        <p class="hero-author">${author} · 愿今夜的阅读安静而有光</p>
      </div>
      <div class="hero-art" aria-hidden="true">${this.art(design.motif)}</div>
    </div>
    <span class="scroll-cue">向下翻页 · 把白日留在身后</span>
  </header>
  <main>
    <section class="night-intro chapter-static">
      <span class="intro-moon">☾</span>
      <div><small>TONIGHT'S BOOK</small><p>${description}</p>${tags ? `<div class="book-tags">${tags}</div>` : ''}</div>
    </section>
    ${sections}
    <section class="chapter-static mindmap-section">
      <div class="ch-tag">全 书 脉 络</div>
      <h2>一张图，带走今夜的阅读</h2>
      <div class="markmap-box"><div class="markmap" style="height:560px"><script type="text/template">${this.mindmap(book)}</script></div></div>
    </section>
  </main>
  <footer class="tonight">
    <span class="moon">🌙</span>
    <div class="goodnight">晚安</div>
    <p class="bless">愿你合上这本书时，比翻开它之前更安静一点，也更靠近自己一点。</p>
    <p class="src-note">《${title}》· ${author} ｜ ${sourceNote}</p>
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/markmap-autoloader"></script>
  <script>
  (function(){var s=document.querySelector('.theme-select');if(s)s.value=document.body.className;var e=document.querySelectorAll('.chapter');if(!('IntersectionObserver' in window)){e.forEach(function(x){x.classList.add('visible')});return}var o=new IntersectionObserver(function(n){n.forEach(function(x){if(x.isIntersecting){x.target.classList.add('visible');o.unobserve(x.target)}})},{threshold:.12});e.forEach(function(x){o.observe(x)})})();
  window.addEventListener('load',function(){window.dispatchEvent(new Event('resize'));setTimeout(function(){window.dispatchEvent(new Event('resize'))},600);setTimeout(function(){window.dispatchEvent(new Event('resize'))},1800)});
  </script>
</body>
</html>`;
  }

  private section(section: GeneratedSection, index: number): string {
    const blocks = section.blocks?.length
      ? section.blocks.map((block) => this.block(block)).join('\n')
      : `<div class="prose">${this.paragraphs(section.content)}</div>`;
    const numerals = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];
    return `<section class="chapter" id="section-${index + 1}">
      <div class="ch-tag">其 ${numerals[index] || index + 1} · ${this.escape(section.title)}</div>
      <h2>${this.escape(section.title)}</h2>
      <div class="chapter-body">${blocks}</div>
    </section>`;
  }

  private block(block: GeneratedContentBlock): string {
    const title = block.title ? `<h3>${this.escape(block.title)}</h3>` : '';
    switch (block.type) {
      case 'lead': return `<p class="lead">${this.breaks(block.content)}</p>`;
      case 'paragraph': return `<div class="prose">${this.paragraphs(block.content || '')}</div>`;
      case 'quote': return `<blockquote class="quote"><p>${this.breaks(block.content)}</p>${block.attribution ? `<cite>— ${this.escape(block.attribution)}</cite>` : ''}</blockquote>`;
      case 'callout': return `<aside class="sup-note"><b>✦ 深夜加餐</b>${title}<p>${this.breaks(block.content)}</p></aside>`;
      case 'cards': return `<div class="block-group">${title}<div class="card-grid">${(block.items || []).map((item, index) => `<article class="idea-card"><span>${String(index + 1).padStart(2, '0')}</span>${item.title ? `<h4>${this.escape(item.title)}</h4>` : ''}<p>${this.breaks(item.content)}</p></article>`).join('')}</div></div>`;
      case 'steps': return `<div class="block-group">${title}<div class="tip-list">${(block.items || []).map((item, index) => `<article class="tip-card"><span>${index + 1}</span><div>${item.title ? `<h4>${this.escape(item.title)}</h4>` : ''}<p>${this.breaks(item.content)}</p></div></article>`).join('')}</div></div>`;
      case 'comparison': return `<div class="block-group">${title}<div class="comparison"><article><small>需要留意</small><h4>${this.escape(block.left?.title || '')}</h4><p>${this.breaks(block.left?.content)}</p></article><i>→</i><article><small>温柔转向</small><h4>${this.escape(block.right?.title || '')}</h4><p>${this.breaks(block.right?.content)}</p></article></div></div>`;
      case 'checklist': return `<div class="block-group checklist">${title}<ul>${(block.items || []).map((item) => `<li><i>✓</i><span>${item.title ? `<strong>${this.escape(item.title)}</strong>` : ''}${this.breaks(item.content)}</span></li>`).join('')}</ul></div>`;
      case 'tags': return `<div class="block-group">${title}<div class="say-grid">${(block.items || []).map((item) => `<span class="say-chip">${this.escape(item.title || item.content)}</span>`).join('')}</div></div>`;
      case 'stats': return `<div class="block-group">${title}<div class="stat-grid">${(block.items || []).map((item) => `<article class="stat-card"><strong>${this.escape(item.value || item.title || '•')}</strong><span>${this.escape(item.label || item.content)}</span>${item.value || item.label ? `<p>${this.breaks(item.content)}</p>` : ''}</article>`).join('')}</div></div>`;
      default: return '';
    }
  }

  private art(motif: GeneratedBookDesign['motif']): string {
    const common = 'viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg"';
    if (motif === 'waves') return `<svg ${common}><circle class="moon-shape" cx="306" cy="67" r="38"/><path class="draw" d="M35 192c55-48 105-48 160 0s105 48 190 0M35 238c55-48 105-48 160 0s105 48 190 0"/></svg>`;
    if (motif === 'mountain') return `<svg ${common}><circle class="moon-shape" cx="315" cy="62" r="36"/><path class="soft" d="m24 283 116-164 70 82 54-68 134 150z"/><path class="draw" d="m24 283 116-164 70 82 54-68 134 150"/></svg>`;
    if (motif === 'path') return `<svg ${common}><circle class="moon-shape" cx="330" cy="62" r="35"/><path class="soft" d="M146 320c19-89 52-159 105-207 43-39 84-64 132-89-61 18-114 43-159 82-67 57-101 128-119 214z"/><path class="draw" d="M126 320c22-91 55-157 112-207 43-38 88-63 145-89"/></svg>`;
    if (motif === 'orbit') return `<svg ${common}><g class="orbit"><ellipse cx="210" cy="163" rx="155" ry="58"/><ellipse cx="210" cy="163" rx="155" ry="58" transform="rotate(58 210 163)"/></g><circle class="moon-shape" cx="210" cy="163" r="42"/><circle class="star" cx="86" cy="236" r="7"/></svg>`;
    if (motif === 'constellation') return `<svg ${common}><path class="draw" d="m45 241 70-133 82 57 60-112 113 74-47 123-117 21z"/><g class="stars"><circle cx="45" cy="241" r="5"/><circle cx="115" cy="108" r="8"/><circle cx="197" cy="165" r="5"/><circle cx="257" cy="53" r="7"/><circle cx="370" cy="127" r="5"/><circle cx="323" cy="250" r="7"/></g></svg>`;
    return `<svg ${common}><circle class="moon-shape" cx="326" cy="61" r="35"/><path class="soft" d="M65 85c56-22 104-12 145 28 41-40 89-50 145-28v184c-60-19-106-9-145 29-39-38-85-48-145-29z"/><path class="draw" d="M65 85c56-22 104-12 145 28 41-40 89-50 145-28v184c-60-19-106-9-145 29-39-38-85-48-145-29zm145 28v185"/></svg>`;
  }

  private mindmap(book: GeneratedBook): string {
    const lines = [`## 《${this.markdown(book.title)}》`];
    for (const section of book.sections) {
      lines.push(`### ${this.markdown(section.title)}`);
      const items = (section.blocks || []).flatMap((block) => block.items || []).slice(0, 4);
      if (items.length) items.forEach((item) => lines.push(`#### ${this.markdown(item.title || item.label || item.content).slice(0, 70)}`));
      else lines.push(`#### ${this.markdown(section.content).slice(0, 70)}`);
    }
    return this.escape(lines.join('\n'));
  }

  private styles(signature: string): string {
    return `body.theme-default{${signature}}
body.theme-mint{--bg:#f2faf5;--text:#2f3f36;--text2:#7d9488;--card:#fdfffd;--border:#d3e8da;--accent:#3e9d6e;--accent2:#2b8a8a;--accent3:#d98e5f;--soft:#e6f4ea;--gold:#c8a23e;--hero-top:#eef8f1;--hero-via:#e8f4ec;--hero-bot:#e0f0e5;--quote-bg:#eff8f1;--shadow:rgba(60,110,80,.14)}
body.theme-cloud{--bg:#f5f7fa;--text:#37404d;--text2:#8b95a5;--card:#fff;--border:#dde4ec;--accent:#5b84b1;--accent2:#8f7bb0;--accent3:#c98a7d;--soft:#edf1f6;--gold:#c2a24d;--hero-top:#f2f5f9;--hero-via:#eef2f7;--hero-bot:#e9eef4;--quote-bg:#f0f4f8;--shadow:rgba(80,100,130,.14)}
body.theme-bamboo{--bg:#f4f7ee;--text:#33402e;--text2:#7f8f76;--card:#fcfdf7;--border:#dbe3cd;--accent:#5f8a46;--accent2:#b0a03c;--accent3:#c07a50;--soft:#eef2e3;--gold:#b3a044;--hero-top:#f1f5e8;--hero-via:#ecf1e0;--hero-bot:#e6edd9;--quote-bg:#eff3e6;--shadow:rgba(90,110,60,.14)}
body.theme-amber{--bg:#fbf5e8;--text:#463a24;--text2:#97875f;--card:#fffaf0;--border:#e8dab5;--accent:#c08a2d;--accent2:#a76b2f;--accent3:#7d8a4a;--soft:#f5ecd6;--gold:#c08a2d;--hero-top:#faf1da;--hero-via:#f7ecd2;--hero-bot:#f3e6c6;--quote-bg:#f7efd9;--shadow:rgba(140,110,50,.16)}
body.theme-dawn{--bg:#fdf3ec;--text:#4a3530;--text2:#a2837a;--card:#fff9f4;--border:#f0d9c9;--accent:#d8794a;--accent2:#c25e6a;--accent3:#7a9b8d;--soft:#faeadf;--gold:#d08a4e;--hero-top:#fdeee2;--hero-via:#fbe7dc;--hero-bot:#f7dfd3;--quote-bg:#fbeee4;--shadow:rgba(170,100,70,.15)}
body.theme-lavender{--bg:#f6f3fa;--text:#3c3547;--text2:#8f86a0;--card:#fdfcff;--border:#e2dbee;--accent:#8a6fb8;--accent2:#b0789a;--accent3:#6f9b8d;--soft:#f0ecf7;--gold:#b99a55;--hero-top:#f3eef9;--hero-via:#f0eaf6;--hero-bot:#ece4f2;--quote-bg:#f2edf8;--shadow:rgba(110,90,150,.14)}
body.theme-slate{--bg:#eef1f0;--text:#35403d;--text2:#7e8b87;--card:#f9fbfa;--border:#d6dedb;--accent:#557d6e;--accent2:#7d8a9b;--accent3:#b08968;--soft:#e5eae8;--gold:#b3985a;--hero-top:#eaeef0;--hero-via:#e6ebe9;--hero-bot:#e2e8e5;--quote-bg:#e9eeec;--shadow:rgba(70,90,85,.14)}
body.theme-rose{--bg:#fdf2f4;--text:#4a3238;--text2:#a3838b;--card:#fffafa;--border:#f0d8dd;--accent:#c25e75;--accent2:#a8769b;--accent3:#6f9b7f;--soft:#f9e8ec;--gold:#c39a55;--hero-top:#fbebee;--hero-via:#f9e6ea;--hero-bot:#f6e0e5;--quote-bg:#faedf0;--shadow:rgba(160,90,110,.14)}
body.theme-sakura{--bg:#fdf5f6;--text:#45343c;--text2:#a18a92;--card:#fffbfc;--border:#f0dde1;--accent:#d68799;--accent2:#9bb08a;--accent3:#b98d6e;--soft:#f9edef;--gold:#c3a25e;--hero-top:#fbf0f2;--hero-via:#f9eaee;--hero-bot:#f7e5e9;--quote-bg:#faeff1;--shadow:rgba(170,110,130,.14)}
body.theme-forest{--bg:#17231c;--text:#e4ead9;--text2:#93a48f;--card:#1e2d23;--border:#2f4234;--accent:#8fbf6f;--accent2:#d3a94f;--accent3:#c07a58;--soft:#24352a;--gold:#d8b25e;--hero-top:#0f1a14;--hero-via:#16241b;--hero-bot:#1d2e22;--quote-bg:#213226;--shadow:rgba(0,0,0,.4)}
body.theme-ocean{--bg:#14212b;--text:#e2e9ee;--text2:#8fa3b0;--card:#1b2b37;--border:#2c4252;--accent:#5fa8c9;--accent2:#d3a94f;--accent3:#c9806a;--soft:#203140;--gold:#d8b25e;--hero-top:#0e1a24;--hero-via:#14242f;--hero-bot:#1a2e3a;--quote-bg:#1d2e3b;--shadow:rgba(0,0,0,.42)}
body.theme-sand{--bg:#f7f1e3;--text:#4a4030;--text2:#9a8c6e;--card:#fdf8ec;--border:#e5d8bb;--accent:#b3873f;--accent2:#8a9b5a;--accent3:#bf6e4e;--soft:#f1e8d3;--gold:#b3873f;--hero-top:#f5ecd6;--hero-via:#f2e7cd;--hero-bot:#efe2c3;--quote-bg:#f4ecd7;--shadow:rgba(130,110,60,.16)}
body.theme-night{--bg:#171a26;--text:#e8e4d8;--text2:#98a0b3;--card:#1e2333;--border:#2f3750;--accent:#d3a94f;--accent2:#8fa8c9;--accent3:#c0705a;--soft:#232a40;--gold:#d8b25e;--hero-top:#101322;--hero-via:#171b2e;--hero-bot:#221f30;--quote-bg:#1f2536;--shadow:rgba(0,0,0,.45)}
body.theme-charcoal{--bg:#1b1b1d;--text:#e9e6e0;--text2:#9b968c;--card:#242426;--border:#38383a;--accent:#c9a25c;--accent2:#8aa39b;--accent3:#c07a5a;--soft:#28282a;--gold:#d0ac62;--hero-top:#161618;--hero-via:#1d1d1f;--hero-bot:#242426;--quote-bg:#232325;--shadow:rgba(0,0,0,.45)}
body.theme-deepsea{--bg:#101b26;--text:#dde8ee;--text2:#8499a8;--card:#162532;--border:#253d4e;--accent:#6fb8c9;--accent2:#d3a94f;--accent3:#c9806a;--soft:#1a2c3b;--gold:#d8b25e;--hero-top:#0b141d;--hero-via:#122029;--hero-bot:#182a36;--quote-bg:#152634;--shadow:rgba(0,0,0,.45)}
*{box-sizing:border-box}html{scroll-behavior:smooth;overflow-x:hidden}body{margin:0;overflow-x:hidden;color:var(--text);background:var(--bg);font:17px/1.95 'Noto Serif SC',serif;transition:background .45s,color .45s;-webkit-text-size-adjust:100%}body:before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 12% 8%,var(--soft),transparent 40%),radial-gradient(circle at 88% 92%,var(--soft),transparent 42%)}h1,h2,h3,h4{font-family:'ZCOOL XiaoWei','Noto Serif SC',serif}.theme-select{position:fixed;z-index:99;top:16px;right:16px;max-width:160px;padding:8px 15px;color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:99px;box-shadow:0 6px 24px var(--shadow);font:13px 'Noto Serif SC',serif}
.goodnight-hero{position:relative;min-height:100svh;padding:80px max(22px,calc((100vw - 1080px)/2)) 55px;display:grid;align-content:center;overflow:hidden;background:linear-gradient(180deg,var(--hero-top),var(--hero-via),var(--hero-bot));isolation:isolate}.goodnight-hero:before{content:"";position:absolute;right:-12%;top:-22%;width:620px;height:620px;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:50%;box-shadow:0 0 110px color-mix(in srgb,var(--gold) 18%,transparent);opacity:.65}.series-tag{position:relative;justify-self:start;margin-bottom:30px;padding:7px 19px;color:var(--text2);background:color-mix(in srgb,var(--card) 72%,transparent);border:1px solid var(--border);border-radius:99px;font:11px/1.2 system-ui,sans-serif;letter-spacing:.28em}.hero-layout{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:45px;align-items:center}.hero-copy small{color:var(--accent);font:10px system-ui,sans-serif;letter-spacing:.24em}.hero-copy h1{max-width:720px;margin:20px 0 13px;font-size:clamp(48px,7vw,82px);font-weight:500;line-height:1.1;letter-spacing:.05em}.hero-sub{margin:0;color:var(--accent);font-size:clamp(18px,2.5vw,26px);letter-spacing:.13em}.hero-quote{max-width:620px;margin:27px 0 0;padding-left:18px;color:var(--text2);border-left:2px solid var(--accent2);font-size:15px}.hero-author{margin-top:29px;color:var(--text2);font-size:12px;letter-spacing:.12em}.hero-art{color:var(--accent);filter:drop-shadow(0 22px 45px var(--shadow))}.hero-art svg{width:100%;overflow:visible}.hero-art .soft{fill:color-mix(in srgb,var(--accent) 16%,transparent)}.hero-art .draw,.hero-art .orbit ellipse{fill:none;stroke:currentColor;stroke-width:1.5;stroke-dasharray:7 8;animation:draw 24s linear infinite}.hero-art .moon-shape{fill:color-mix(in srgb,var(--gold) 68%,transparent);animation:moonGlow 4s ease-in-out infinite}.hero-art .stars,.hero-art .star{fill:var(--gold)}.scroll-cue{position:absolute;left:50%;bottom:24px;color:var(--text2);font-size:10px;letter-spacing:.18em;transform:translateX(-50%)}@keyframes draw{to{stroke-dashoffset:-260}}@keyframes moonGlow{50%{opacity:.62;filter:drop-shadow(0 0 16px var(--gold))}}
main{width:min(900px,calc(100% - 40px));margin:auto}.chapter,.chapter-static{position:relative;padding:76px 0;z-index:1}.chapter{opacity:0;transform:translateY(30px);transition:opacity .8s ease,transform .8s ease}.chapter.visible{opacity:1;transform:none}.night-intro{margin-top:-34px;padding:28px 34px;display:grid;grid-template-columns:54px 1fr;gap:22px;background:var(--card);border:1px solid var(--border);border-radius:18px;box-shadow:0 20px 50px var(--shadow)}.intro-moon{width:48px;height:48px;display:grid;place-items:center;color:var(--card);background:var(--accent);border-radius:50%;font-size:24px}.night-intro small,.ch-tag{color:var(--accent);font:10px system-ui,sans-serif;letter-spacing:.25em}.night-intro p{margin:8px 0 0;color:var(--text2)}.book-tags{margin-top:14px;display:flex;flex-wrap:wrap;gap:8px}.book-tags span,.say-chip{padding:5px 12px;color:var(--accent);background:var(--soft);border-radius:99px;font:12px system-ui,sans-serif}.chapter>h2,.chapter-static>h2{margin:13px 0 32px;font-size:clamp(28px,4.5vw,40px);font-weight:500}.chapter-body{display:grid;gap:25px}.lead{margin:0;padding:4px 0 4px 20px;color:var(--accent);border-left:3px solid var(--accent);font-size:20px}.prose{display:grid;gap:16px}.prose p{margin:0;text-align:justify}.quote{margin:0;padding:28px 31px;text-align:center;background:var(--quote-bg);border:1px solid var(--border);border-radius:16px}.quote p{margin:0;font-size:19px}.quote cite{display:block;margin-top:10px;color:var(--text2);font-size:12px;font-style:normal}.sup-note{padding:20px 23px;background:var(--soft);border-left:3px dashed var(--accent2);border-radius:0 14px 14px 0}.sup-note>b{display:block;margin-bottom:8px;color:var(--accent2);font-size:12px;letter-spacing:.14em}.sup-note h3,.sup-note p{margin:5px 0}.block-group>h3{margin:0 0 15px;font-size:22px}.card-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}.idea-card,.comparison article,.stat-card{padding:23px;background:var(--card);border:1px solid var(--border);border-radius:16px;box-shadow:0 7px 24px var(--shadow)}.idea-card>span,.comparison small{color:var(--accent);font:10px system-ui,sans-serif;letter-spacing:.16em}.idea-card h4,.comparison h4,.tip-card h4{margin:8px 0 6px;font-size:18px}.idea-card p,.comparison p,.tip-card p{margin:0;color:var(--text2);font-size:15px}.tip-list{display:grid;gap:13px}.tip-card{padding:20px 22px;display:grid;grid-template-columns:42px 1fr;gap:16px;background:var(--card);border:1px solid var(--border);border-radius:15px}.tip-card>span{width:38px;height:38px;display:grid;place-items:center;color:var(--card);background:var(--accent);border-radius:50%;font:600 13px system-ui}.comparison{display:grid;grid-template-columns:1fr 34px 1fr;gap:12px}.comparison>i{display:grid;place-items:center;color:var(--accent);font-style:normal}.checklist{padding:24px;background:var(--card);border:1px solid var(--border);border-radius:16px}.checklist ul{margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;list-style:none}.checklist li{display:flex;gap:9px}.checklist li>i{width:21px;height:21px;display:grid;place-items:center;flex:0 0 auto;color:var(--card);background:var(--accent2);border-radius:50%;font:normal 11px system-ui}.checklist strong{display:block}.say-grid{display:flex;flex-wrap:wrap;gap:10px}.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.stat-card{text-align:center}.stat-card strong{display:block;color:var(--accent);font-size:26px}.stat-card span{font-size:13px}.stat-card p{margin:6px 0 0;color:var(--text2);font-size:12px}.markmap-box{width:100%;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:20px;box-shadow:0 8px 30px var(--shadow)}.markmap{min-height:560px;width:100%;overflow:hidden}.markmap-foreign{color:var(--text)!important;font-family:'Noto Serif SC',serif!important}.markmap-link{stroke:var(--accent)!important;opacity:.5}.markmap-node circle{fill:var(--accent)!important}.tonight{padding:72px 24px;text-align:center;color:var(--text);background:linear-gradient(180deg,var(--bg),var(--hero-bot))}.tonight .moon{display:block;margin-bottom:16px;font-size:30px;animation:moonGlow 4s ease-in-out infinite}.goodnight{margin-bottom:17px;font:1.7rem 'ZCOOL XiaoWei',serif;letter-spacing:.5em;text-indent:.5em}.bless{max-width:600px;margin:0 auto 23px;color:var(--text2)}.src-note{color:var(--text2);font-size:11px;opacity:.72}
@media(max-width:760px){body{font-size:15.5px}.theme-select{top:10px;right:10px;max-width:132px;padding:6px 10px;font-size:12px}.goodnight-hero{min-height:100svh;padding:82px 20px 58px}.series-tag{margin-bottom:22px}.hero-layout{grid-template-columns:1fr}.hero-copy h1{font-size:clamp(38px,13vw,58px)}.hero-art{position:absolute;right:-75px;bottom:-95px;width:340px;opacity:.25}.hero-quote{font-size:14px}.scroll-cue{width:100%;text-align:center}main{width:min(100% - 30px,900px)}.night-intro{margin-top:-24px;padding:24px 20px;grid-template-columns:1fr}.chapter,.chapter-static{padding:58px 5px}.card-grid,.comparison,.checklist ul,.stat-grid{grid-template-columns:1fr}.comparison>i{transform:rotate(90deg)}.lead{font-size:18px}.markmap{min-height:500px}.tonight{padding:48px 22px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important}.chapter{opacity:1;transform:none;transition:none}}@media print{.theme-select{display:none}.chapter{opacity:1;transform:none}.goodnight-hero{min-height:620px}.idea-card,.tip-card,.comparison article{break-inside:avoid}}`;
  }

  private paragraphs(value: string): string {
    return value.split(/\n{2,}/).map((paragraph) => `<p>${this.breaks(paragraph.trim())}</p>`).join('');
  }

  private breaks(value?: string): string {
    return this.escape(value || '').replaceAll('\n', '<br>');
  }

  private markdown(value: string): string {
    return String(value || '').replace(/[\r\n]+/g, ' ').replace(/[#*_`<>]/g, '').trim();
  }

  private escape(value: string): string {
    return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }
}

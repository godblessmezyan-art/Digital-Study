import { Injectable } from '@nestjs/common';
import type {
  GeneratedBook,
  GeneratedBookDesign,
  GeneratedContentBlock,
  GeneratedSection,
  GenerationInput,
} from './ai.types';

@Injectable()
export class HtmlRendererService {
  render(book: GeneratedBook, input: GenerationInput): string {
    const title = this.escape(book.title || input.title);
    const author = this.escape(input.author ?? '');
    const category = this.escape(input.categoryName ?? input.categorySlug ?? '未分类');
    const description = this.escape(book.summary);
    const design = this.design(book.design);
    const sections = book.sections.map((section, index) => this.section(section, index)).join('\n');
    const toc = book.sections.map((section, index) => `<a href="#section-${index + 1}"><span>${String(index + 1).padStart(2, '0')}</span>${this.escape(section.title)}</a>`).join('\n');
    const tags = book.tags.slice(0, 8).map((tag) => `<span>${this.escape(tag)}</span>`).join('');

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="${author}">
  <meta name="category" content="${category}">
  <meta name="description" content="${description}">
  <meta name="keywords" content="${book.tags.map((tag) => this.escape(tag)).join(',')}">
  <title>${title}</title>
  <style>${this.styles()}</style>
</head>
<body data-theme="${design.theme}">
  <header class="hero">
    <div class="hero-glow"></div>
    <div class="hero-inner">
      <div class="hero-copy">
        <span class="eyebrow">${this.escape(design.eyebrow)}</span>
        <h1>${title}</h1>
        ${design.subtitle ? `<p class="subtitle">${this.escape(design.subtitle)}</p>` : ''}
        ${design.heroQuote ? `<p class="hero-quote">${this.escape(design.heroQuote)}</p>` : ''}
        <div class="hero-meta">${author ? `<span>${author}</span>` : ''}<span>${category}</span></div>
      </div>
      <div class="hero-art" aria-hidden="true">${this.motif(design.motif)}</div>
    </div>
  </header>
  <main>
    <section class="book-intro">
      <div class="intro-mark">序</div>
      <div><p>${description}</p>${tags ? `<div class="book-tags">${tags}</div>` : ''}</div>
    </section>
    <nav class="toc" aria-label="目录"><div class="toc-title"><small>CONTENTS</small><strong>阅读路径</strong></div><div class="toc-links">${toc}</div></nav>
    ${sections}
  </main>
  <footer class="book-footer"><span>✦</span><p>愿这次阅读，不只停留在理解，也成为生活中的一次微小改变。</p><small>DIGITAL STUDY · 数字书房</small></footer>
</body>
</html>`;
  }

  private design(value?: GeneratedBookDesign): GeneratedBookDesign {
    return value ?? {
      theme: 'literary',
      motif: 'library',
      eyebrow: '数字书房',
      subtitle: '一次有结构的深度阅读',
      heroQuote: '',
    };
  }

  private section(section: GeneratedSection, index: number): string {
    const blocks = section.blocks?.length
      ? section.blocks.map((block) => this.block(block)).join('\n')
      : `<div class="prose">${this.paragraphs(section.content)}</div>`;
    return `<section class="chapter" id="section-${index + 1}" data-section="${this.escape(section.key)}">
      <header class="chapter-heading"><span>${String(index + 1).padStart(2, '0')}</span><div><small>CHAPTER</small><h2>${this.escape(section.title)}</h2></div></header>
      <div class="chapter-body">${blocks}</div>
    </section>`;
  }

  private block(block: GeneratedContentBlock): string {
    const title = block.title ? `<h3>${this.escape(block.title)}</h3>` : '';
    switch (block.type) {
      case 'lead':
        return `<p class="lead">${this.breaks(block.content)}</p>`;
      case 'paragraph':
        return `<div class="prose">${this.paragraphs(block.content ?? '')}</div>`;
      case 'quote':
        return `<blockquote><span>“</span><p>${this.breaks(block.content)}</p>${block.attribution ? `<cite>— ${this.escape(block.attribution)}</cite>` : ''}</blockquote>`;
      case 'callout':
        return `<aside class="callout"><span>✦</span><div>${title}<p>${this.breaks(block.content)}</p></div></aside>`;
      case 'cards':
        return `<div class="block-group">${title}<div class="card-grid">${(block.items ?? []).map((item, index) => `<article class="idea-card"><span>${String(index + 1).padStart(2, '0')}</span>${item.title ? `<h4>${this.escape(item.title)}</h4>` : ''}<p>${this.breaks(item.content)}</p></article>`).join('')}</div></div>`;
      case 'steps':
        return `<div class="block-group">${title}<ol class="steps">${(block.items ?? []).map((item, index) => `<li><span>${index + 1}</span><div>${item.title ? `<h4>${this.escape(item.title)}</h4>` : ''}<p>${this.breaks(item.content)}</p></div></li>`).join('')}</ol></div>`;
      case 'comparison':
        return `<div class="block-group">${title}<div class="comparison"><article class="contrast low"><small>需要留意</small><h4>${this.escape(block.left?.title ?? '')}</h4><p>${this.breaks(block.left?.content)}</p></article><div class="compare-arrow">→</div><article class="contrast high"><small>更好选择</small><h4>${this.escape(block.right?.title ?? '')}</h4><p>${this.breaks(block.right?.content)}</p></article></div></div>`;
      case 'checklist':
        return `<div class="block-group checklist">${title}<ul>${(block.items ?? []).map((item) => `<li><i>✓</i><span>${item.title ? `<strong>${this.escape(item.title)}</strong>` : ''}${this.breaks(item.content)}</span></li>`).join('')}</ul></div>`;
      case 'tags':
        return `<div class="block-group">${title}<div class="concept-tags">${(block.items ?? []).map((item) => `<span>${this.escape(item.title || item.content)}</span>`).join('')}</div></div>`;
      case 'stats':
        return `<div class="block-group">${title}<div class="stats">${(block.items ?? []).map((item) => `<article><strong>${this.escape(item.value || item.title || '•')}</strong><span>${this.escape(item.label || item.content)}</span>${item.value || item.label ? `<p>${this.breaks(item.content)}</p>` : ''}</article>`).join('')}</div></div>`;
      default:
        return '';
    }
  }

  private motif(name: GeneratedBookDesign['motif']): string {
    const common = 'viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg"';
    if (name === 'waves') return `<svg ${common}><g fill="none" stroke="currentColor"><path class="draw" d="M36 195c62-70 118-70 180 0s118 70 268 0"/><path class="draw d2" d="M36 245c62-70 118-70 180 0s118 70 268 0"/><path class="draw d3" d="M36 295c62-70 118-70 180 0s118 70 268 0"/></g><circle class="pulse" cx="260" cy="178" r="36"/></svg>`;
    if (name === 'mountain') return `<svg ${common}><path class="soft" d="M34 350 176 118l70 105 58-84 182 211Z"/><path class="draw" fill="none" stroke="currentColor" d="M34 350 176 118l70 105 58-84 182 211"/><circle class="pulse" cx="401" cy="91" r="34"/></svg>`;
    if (name === 'path') return `<svg ${common}><path class="soft" d="M177 420c28-112 33-176 84-242 40-52 89-88 157-134-85 31-152 67-202 118-69 70-95 151-110 258Z"/><path class="draw" fill="none" stroke="currentColor" d="M145 420c18-105 48-190 112-254C304 119 358 82 437 43"/><circle class="pulse" cx="436" cy="43" r="20"/></svg>`;
    if (name === 'orbit') return `<svg ${common}><g fill="none" stroke="currentColor"><ellipse class="draw" cx="260" cy="210" rx="205" ry="82" transform="rotate(-22 260 210)"/><ellipse class="draw d2" cx="260" cy="210" rx="205" ry="82" transform="rotate(42 260 210)"/></g><circle class="pulse" cx="260" cy="210" r="50"/><circle cx="103" cy="278" r="9" fill="currentColor"/></svg>`;
    if (name === 'constellation') return `<svg ${common}><g fill="none" stroke="currentColor" opacity=".7"><path class="draw" d="m70 310 78-144 94 58 71-132 130 87-55 139-132 26Z"/></g><g fill="currentColor"><circle cx="70" cy="310" r="7"/><circle cx="148" cy="166" r="10"/><circle cx="242" cy="224" r="6"/><circle cx="313" cy="92" r="9"/><circle cx="443" cy="179" r="6"/><circle cx="388" cy="318" r="8"/><circle class="pulse" cx="256" cy="344" r="17"/></g></svg>`;
    return `<svg ${common}><path class="soft" d="M86 105c68-28 124-17 174 32 50-49 106-60 174-32v235c-73-23-128-10-174 38-46-48-101-61-174-38Z"/><path class="draw" fill="none" stroke="currentColor" d="M86 105c68-28 124-17 174 32 50-49 106-60 174-32v235c-73-23-128-10-174 38-46-48-101-61-174-38Zm174 32v241"/><path class="draw d2" fill="none" stroke="currentColor" d="M117 149c51-14 89-3 119 25m-119 42c51-14 89-3 119 25m167-92c-51-14-89-3-119 25m119 42c-51-14-89-3-119 25"/></svg>`;
  }

  private styles(): string {
    return `:root{color-scheme:light dark;--bg:#f5f0e7;--paper:#fffdf8;--text:#2d2924;--muted:#7e7569;--line:#d9cbb7;--accent:#9b6537;--accent2:#315d62;--soft:#eee4d4;--shadow:rgba(57,43,29,.12);--hero:#202b2b;--heroText:#f8f1e5}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--text);background:var(--bg);font:17px/1.9 Georgia,"Noto Serif SC","Songti SC",serif;-webkit-font-smoothing:antialiased}body[data-theme=cosmic]{--bg:#141221;--paper:#1d1930;--text:#eee9f8;--muted:#a89fbd;--line:#3c3455;--accent:#b195ff;--accent2:#e3bb68;--soft:#28213e;--shadow:rgba(0,0,0,.32);--hero:#0e0b19;--heroText:#f6f0ff}body[data-theme=forest]{--bg:#edf1e8;--paper:#fbfcf7;--text:#2d3b30;--muted:#748277;--line:#ced8c8;--accent:#517c56;--accent2:#b07d3f;--soft:#e3ebdf;--hero:#203729;--heroText:#f1f6ed}body[data-theme=ocean]{--bg:#eaf1f3;--paper:#fbfdfd;--text:#263940;--muted:#6e8189;--line:#c8d8dd;--accent:#397d8f;--accent2:#c47b5c;--soft:#dcebed;--hero:#173642;--heroText:#ecf8fa}body[data-theme=amber]{--bg:#f7f0df;--paper:#fffaf0;--text:#40372a;--muted:#8c7d66;--line:#e1d2ad;--accent:#b47b25;--accent2:#687b4d;--soft:#f0e3c4;--hero:#46351d;--heroText:#fff5dc}body[data-theme=rose]{--bg:#f8edef;--paper:#fffafb;--text:#463338;--muted:#91777e;--line:#e7ced3;--accent:#b95f72;--accent2:#668978;--soft:#f3dfe3;--hero:#4a2932;--heroText:#fff2f5}body[data-theme=slate]{--bg:#e9eeef;--paper:#fbfcfc;--text:#2d3a3e;--muted:#728086;--line:#ccd6d9;--accent:#496f78;--accent2:#a27a48;--soft:#dde5e6;--hero:#263a40;--heroText:#f1f6f7}
.hero{position:relative;min-height:680px;overflow:hidden;color:var(--heroText);background:radial-gradient(circle at 78% 18%,color-mix(in srgb,var(--accent) 34%,transparent),transparent 36%),linear-gradient(135deg,var(--hero),color-mix(in srgb,var(--hero) 72%,#000));isolation:isolate}.hero:after{content:"";position:absolute;inset:0;opacity:.12;background-image:linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(90deg,transparent,#000)}.hero-glow{position:absolute;width:480px;height:480px;right:3%;top:8%;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);border-radius:50%;opacity:.28}.hero-glow:before,.hero-glow:after{content:"";position:absolute;inset:55px;border:inherit;border-radius:inherit}.hero-glow:after{inset:118px}.hero-inner{position:relative;z-index:2;width:min(1120px,calc(100% - 48px));min-height:680px;margin:auto;display:grid;grid-template-columns:1.05fr .95fr;align-items:center;gap:48px}.eyebrow{display:inline-flex;padding:7px 15px;border:1px solid color-mix(in srgb,var(--heroText) 24%,transparent);border-radius:99px;font:600 11px/1.2 system-ui,sans-serif;letter-spacing:.24em}.hero h1{max-width:700px;margin:28px 0 14px;font-size:clamp(48px,7.6vw,88px);font-weight:500;line-height:1.08;letter-spacing:.04em}.subtitle{margin:0;color:color-mix(in srgb,var(--heroText) 78%,transparent);font-size:clamp(19px,2.5vw,28px);letter-spacing:.12em}.hero-quote{max-width:620px;margin:34px 0 0;padding-left:20px;color:color-mix(in srgb,var(--heroText) 75%,transparent);border-left:2px solid var(--accent);font-size:15px}.hero-meta{margin-top:38px;display:flex;gap:24px;color:color-mix(in srgb,var(--heroText) 58%,transparent);font:12px system-ui,sans-serif;letter-spacing:.13em}.hero-art{color:var(--accent);filter:drop-shadow(0 20px 35px var(--shadow))}.hero-art svg{width:100%;overflow:visible}.hero-art .soft{fill:color-mix(in srgb,var(--accent) 15%,transparent)}.hero-art .draw{stroke-width:1.4;stroke-dasharray:8 7;animation:dash 22s linear infinite}.hero-art .d2{animation-duration:31s;opacity:.65}.hero-art .d3{animation-duration:39s;opacity:.4}.hero-art .pulse{fill:color-mix(in srgb,var(--accent2) 72%,transparent);transform-box:fill-box;transform-origin:center;animation:pulse 4s ease-in-out infinite}@keyframes dash{to{stroke-dashoffset:-300}}@keyframes pulse{50%{transform:scale(1.12);opacity:.65}}
main{width:min(960px,calc(100% - 40px));margin:auto}.book-intro{margin:-52px auto 0;position:relative;z-index:3;padding:36px 42px;display:grid;grid-template-columns:64px 1fr;gap:25px;background:var(--paper);border:1px solid var(--line);border-radius:18px;box-shadow:0 22px 60px var(--shadow)}.intro-mark{width:54px;height:54px;display:grid;place-items:center;color:var(--paper);background:var(--accent);border-radius:50%;font-size:24px}.book-intro p{margin:0;color:var(--muted)}.book-tags,.concept-tags{margin-top:18px;display:flex;flex-wrap:wrap;gap:8px}.book-tags span,.concept-tags span{padding:5px 12px;color:var(--accent);background:var(--soft);border-radius:99px;font:12px system-ui,sans-serif}.toc{margin:70px 0 18px;padding:30px 34px;display:grid;grid-template-columns:190px 1fr;gap:34px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.toc-title{display:grid;align-content:start}.toc-title small,.chapter-heading small{color:var(--accent);font:10px system-ui,sans-serif;letter-spacing:.24em}.toc-title strong{margin-top:4px;font-size:21px}.toc-links{display:grid;grid-template-columns:1fr 1fr;gap:5px 25px}.toc-links a{padding:6px 0;color:var(--muted);text-decoration:none;font-size:14px;border-bottom:1px dotted color-mix(in srgb,var(--line) 70%,transparent)}.toc-links a:hover{color:var(--accent)}.toc-links span{display:inline-block;width:32px;color:var(--accent);font:10px system-ui,sans-serif}
.chapter{padding:82px 0 26px;scroll-margin-top:30px}.chapter-heading{margin-bottom:42px;display:flex;align-items:flex-start;gap:22px}.chapter-heading>span{color:var(--accent);font:500 38px/1 system-ui,sans-serif;opacity:.28}.chapter-heading h2{margin:5px 0 0;font-size:clamp(29px,4vw,42px);font-weight:500;line-height:1.25}.chapter-body{display:grid;gap:28px}.lead{margin:0;padding:4px 0 4px 23px;color:var(--accent);border-left:3px solid var(--accent);font-size:21px;line-height:1.75}.prose{display:grid;gap:16px}.prose p{margin:0;text-align:justify}.block-group>h3{margin:0 0 16px;font-size:22px;font-weight:500}.card-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}.idea-card{position:relative;padding:24px;background:var(--paper);border:1px solid var(--line);border-radius:16px;box-shadow:0 9px 28px var(--shadow)}.idea-card>span{color:var(--accent);font:10px system-ui,sans-serif;letter-spacing:.15em}.idea-card h4,.steps h4,.contrast h4{margin:8px 0 6px;font-size:18px}.idea-card p,.steps p,.contrast p{margin:0;color:var(--muted);font-size:15px}blockquote{margin:4px 0;padding:32px 36px;position:relative;text-align:center;background:var(--soft);border-radius:18px}blockquote>span{position:absolute;left:22px;top:4px;color:var(--accent);font-size:62px;opacity:.35}blockquote p{margin:0;font-size:21px}blockquote cite{display:block;margin-top:12px;color:var(--muted);font-size:12px;font-style:normal}.callout{padding:22px 25px;display:flex;gap:16px;background:color-mix(in srgb,var(--soft) 68%,var(--paper));border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:4px 14px 14px 4px}.callout>span{color:var(--accent)}.callout h3{margin:0 0 5px;font-size:17px}.callout p{margin:0;color:var(--muted)}
.steps{margin:0;padding:0;display:grid;gap:13px;list-style:none}.steps li{padding:20px 22px;display:grid;grid-template-columns:48px 1fr;gap:17px;align-items:start;background:var(--paper);border:1px solid var(--line);border-radius:14px}.steps li>span{width:42px;height:42px;display:grid;place-items:center;color:var(--paper);background:var(--accent);border-radius:50%;font:600 14px system-ui,sans-serif}.steps h4{margin-top:0}.comparison{display:grid;grid-template-columns:1fr 38px 1fr;gap:12px;align-items:stretch}.contrast{padding:25px;background:var(--paper);border:1px solid var(--line);border-radius:16px}.contrast.low{border-top:3px solid var(--muted)}.contrast.high{border-top:3px solid var(--accent)}.contrast small{font:10px system-ui,sans-serif;letter-spacing:.16em;color:var(--muted)}.compare-arrow{display:grid;place-items:center;color:var(--accent);font-size:24px}.checklist{padding:26px 28px;background:var(--paper);border:1px solid var(--line);border-radius:17px}.checklist ul{margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;list-style:none}.checklist li{display:flex;gap:10px;align-items:flex-start}.checklist i{width:22px;height:22px;flex:0 0 22px;display:grid;place-items:center;color:var(--paper);background:var(--accent2);border-radius:50%;font:normal 11px system-ui}.checklist strong{display:block}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.stats article{padding:24px 18px;text-align:center;background:var(--paper);border:1px solid var(--line);border-radius:16px}.stats strong{display:block;color:var(--accent);font-size:28px}.stats span{display:block;font-size:13px}.stats p{margin:7px 0 0;color:var(--muted);font-size:12px}.book-footer{margin-top:100px;padding:74px 24px;text-align:center;color:var(--heroText);background:var(--hero)}.book-footer>span{color:var(--accent);font-size:26px}.book-footer p{max-width:620px;margin:17px auto}.book-footer small{opacity:.5;font:10px system-ui,sans-serif;letter-spacing:.2em}
.hero h1{font-size:clamp(46px,6vw,72px);line-height:1.1;letter-spacing:.03em}
@media(max-width:760px){body{font-size:16px}.hero,.hero-inner{min-height:720px}.hero-inner{padding:72px 0 55px;grid-template-columns:1fr}.hero h1{font-size:50px}.hero-art{position:absolute;right:-70px;bottom:-50px;width:360px;opacity:.3}.book-intro{margin-top:-34px;padding:28px 24px;grid-template-columns:1fr}.intro-mark{width:42px;height:42px;font-size:18px}.toc{padding:26px 5px;grid-template-columns:1fr}.toc-links{grid-template-columns:1fr}.chapter{padding-top:62px}.chapter-heading{gap:13px}.chapter-heading>span{font-size:27px}.card-grid,.checklist ul,.stats{grid-template-columns:1fr}.comparison{grid-template-columns:1fr}.compare-arrow{transform:rotate(90deg)}blockquote{padding:28px 24px}.lead{font-size:18px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important}}@media print{body{background:#fff}.hero{min-height:520px}.book-intro{box-shadow:none}.chapter{break-inside:avoid}.idea-card,.steps li,.contrast,.checklist{break-inside:avoid}}`;
  }

  private paragraphs(value: string): string {
    return value.split(/\n{2,}/).map((paragraph) => `<p>${this.breaks(paragraph.trim())}</p>`).join('');
  }

  private breaks(value?: string): string {
    return this.escape(value ?? '').replaceAll('\n', '<br>');
  }

  private escape(value: string): string {
    return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }
}

import { streamReadingAI } from './reading-ai-client.js?v=1';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const quickActions = ['解释这段', '举个例子', '提出反例', '联系上下文', '提炼核心观点'];

export class ReadingAIAssistant {
  constructor({ container, book, showToast, onSaveNote }) {
    this.container = container;
    this.book = book;
    this.showToast = showToast;
    this.onSaveNote = onSaveNote;
    this.messages = [];
    this.context = null;
    this.controller = null;
    this.generating = false;
    this.root = document.createElement('aside');
    this.root.className = 'reading-ai-assistant';
    this.root.hidden = true;
    this.root.innerHTML = `<header><div><small>READING INTELLIGENCE</small><h2>AI 阅读助手</h2></div><button type="button" data-ai-close aria-label="关闭">×</button></header>
      <section class="reading-ai-source" data-ai-source><span>等待选择原文</span></section>
      <div class="reading-ai-messages" data-ai-messages><div class="reading-ai-empty"><i>✦</i><strong>从一段原文开始</strong><p>选择你想理解的文字，阅读助手会结合当前章节和你的阅读记录进行分析。</p></div></div>
      <section class="reading-ai-actions" data-ai-actions>${quickActions.map(action => `<button type="button" data-ai-action="${esc(action)}">${esc(action)}</button>`).join('')}</section>
      <form class="reading-ai-form" data-ai-form><textarea data-ai-input rows="2" maxlength="4000" placeholder="继续追问这段文字…"></textarea><div><small>AI 分析可能有误，请以原文为准</small><button type="button" data-ai-stop hidden>停止</button><button type="submit" data-ai-send>发送</button></div></form>`;
    container.append(this.root);
    this.messageRoot = this.root.querySelector('[data-ai-messages]');
    this.sourceRoot = this.root.querySelector('[data-ai-source]');
    this.input = this.root.querySelector('[data-ai-input]');
    this.stopButton = this.root.querySelector('[data-ai-stop]');
    this.sendButton = this.root.querySelector('[data-ai-send]');
    this.root.querySelector('[data-ai-close]').onclick = () => this.close();
    this.stopButton.onclick = () => this.stop();
    this.root.querySelectorAll('[data-ai-action]').forEach(button => button.onclick = () => this.ask(button.dataset.aiAction));
    this.root.querySelector('[data-ai-form]').onsubmit = event => {
      event.preventDefault();
      const question = this.input.value.trim();
      if (!question) return;
      this.input.value = '';
      this.ask(question);
    };
  }

  open(context) {
    const key = `${context.bookSlug}:${context.chapterId}:${context.selectedText}`;
    if (this.sessionKey !== key) {
      this.stop();
      this.sessionKey = key;
      this.context = context;
      this.messages = [];
      this.messageRoot.innerHTML = `<div class="reading-ai-selection"><small>书中内容 · ${esc(context.chapterTitle)}</small><blockquote>${esc(context.selectedText)}</blockquote></div>`;
    } else {
      this.context = context;
    }
    this.root.hidden = false;
    this.sourceRoot.innerHTML = `<span>书中内容</span><b>${esc(this.book.title)}</b><em>${esc(context.chapterTitle)}</em>`;
    setTimeout(() => this.input.focus(), 50);
  }

  chapterChanged(chapter) {
    if (this.root.hidden || !this.context || chapter.id === this.context.chapterId) return;
    this.stop();
    this.context = null;
    this.sessionKey = '';
    this.messages = [];
    this.sourceRoot.innerHTML = `<span>章节已切换</span><b>${esc(chapter.title)}</b>`;
    this.messageRoot.innerHTML = '<div class="reading-ai-empty"><i>↳</i><strong>上下文已更新</strong><p>请在当前章节重新选择一段文字，避免沿用上一章的讨论语境。</p></div>';
  }

  close() {
    this.stop();
    this.root.hidden = true;
  }

  async ask(question) {
    if (!this.context || this.generating || !question?.trim()) return;
    this.messages.push({ role: 'user', content: question.trim() });
    this.appendMessage('user', question.trim());
    const answer = this.appendMessage('assistant', '');
    const content = answer.querySelector('[data-ai-content]');
    this.controller = new AbortController();
    this.setGenerating(true);
    let text = '';
    try {
      await streamReadingAI({
        bookSlug: this.context.bookSlug,
        chapterId: this.context.chapterId,
        chapterTitle: this.context.chapterTitle,
        selectedText: this.context.selectedText,
        nearbyText: this.context.nearbyText,
        messages: this.messages,
      }, {
        signal: this.controller.signal,
        onEvent: event => {
          if (event.type === 'sources') this.paintSources(event.sources);
          if (event.type === 'delta') { text += event.text || ''; content.textContent = text; this.messageRoot.scrollTop = this.messageRoot.scrollHeight; }
          if (event.type === 'error') throw new Error(event.message || 'AI 阅读助手暂时不可用');
        },
      });
      if (!text) throw new Error('AI 没有返回内容');
      this.messages.push({ role: 'assistant', content: text });
      const footer = document.createElement('footer');
      footer.innerHTML = '<button type="button">保存为笔记</button>';
      footer.querySelector('button').onclick = () => this.onSaveNote?.(this.context.selection, `AI 辅助解释：\n${text}`);
      answer.append(footer);
    } catch (error) {
      if (error?.name === 'AbortError') content.textContent = text || '已停止生成。';
      else { content.textContent = text || 'AI 阅读助手暂时不可用，正常阅读、书摘和笔记不受影响。'; this.showToast(error.message || 'AI 请求失败'); }
    } finally {
      this.controller = null;
      this.setGenerating(false);
    }
  }

  stop() {
    this.controller?.abort();
    this.controller = null;
    this.setGenerating(false);
  }

  setGenerating(value) {
    this.generating = value;
    this.stopButton.hidden = !value;
    this.sendButton.disabled = value;
    this.root.querySelectorAll('[data-ai-action]').forEach(button => button.disabled = value);
  }

  paintSources(sources) {
    this.sourceRoot.innerHTML = `<span>书中内容</span><b>${esc(sources?.book?.title || this.book.title)}</b><em>${esc(sources?.chapter?.title || this.context?.chapterTitle || '正文')}</em>${sources?.noteCount ? `<small>你的笔记 ${sources.noteCount}</small>` : ''}${sources?.excerptCount ? `<small>你的书摘 ${sources.excerptCount}</small>` : ''}`;
  }

  appendMessage(role, content) {
    const article = document.createElement('article');
    article.className = `reading-ai-message ${role}`;
    article.innerHTML = `<header>${role === 'user' ? '你的追问' : 'AI 分析'}</header><div data-ai-content></div>`;
    article.querySelector('[data-ai-content]').textContent = content;
    this.messageRoot.append(article);
    this.messageRoot.scrollTop = this.messageRoot.scrollHeight;
    return article;
  }
}

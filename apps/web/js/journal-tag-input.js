import { escapeJournalHtml } from './journal-components.js';

export function JournalTagInput(root, initialTags = [], suggestions = [], onChange = () => {}) {
  let tags = [...new Set(initialTags)].slice(0, 20);
  const input = root.querySelector('[data-tag-input]');
  const list = root.querySelector('[data-tag-list]');
  const datalist = root.querySelector('[data-tag-suggestions]');
  datalist.innerHTML = suggestions.filter(tag => !tags.includes(tag)).map(tag => `<option value="${escapeJournalHtml(tag)}"></option>`).join('');
  const paint = () => {
    list.innerHTML = tags.map(tag => `<span>#${escapeJournalHtml(tag)}<button type="button" data-remove-tag="${escapeJournalHtml(tag)}" aria-label="删除标签 ${escapeJournalHtml(tag)}">×</button></span>`).join('');
    list.querySelectorAll('[data-remove-tag]').forEach(button => button.onclick = () => {
      tags = tags.filter(tag => tag !== button.dataset.removeTag); paint(); onChange(tags);
    });
  };
  const add = () => {
    const values = input.value.split(/[,，]+/).map(tag => tag.replace(/^#/, '').trim()).filter(Boolean);
    if (!values.length) return;
    tags = [...new Set([...tags, ...values])].slice(0, 20); input.value = ''; paint(); onChange(tags);
  };
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(); }
    if (event.key === 'Backspace' && !input.value && tags.length) { tags.pop(); paint(); onChange(tags); }
  });
  input.addEventListener('blur', add);
  paint();
  return { value: () => [...tags] };
}

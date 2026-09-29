import { escapeJournalHtml, localDate, MOODS, todayValue } from './journal-components.js';

const keyFor = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function dayDetail(dateKey, entries) {
  const items = entries.filter(entry => entry.entryDate === dateKey);
  const label = localDate(dateKey).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  return `<section class="journal-calendar-detail"><div><small>${escapeJournalHtml(label)}</small><h3>${items.length ? `${items.length} 篇手记` : '这一天尚未落笔'}</h3></div><div>${items.length ? items.map(entry => `<a href="journal/${encodeURIComponent(entry.id)}"><span>${entry.mood && MOODS[entry.mood] ? MOODS[entry.mood].icon : '·'}</span><b>${escapeJournalHtml(entry.title)}</b></a>`).join('') : `<a class="journal-calendar-write" href="journal/new?date=${dateKey}">写下这一天</a>`}</div></section>`;
}

export function JournalCalendar(root, entries, initialDate = todayValue()) {
  let cursor = localDate(initialDate);
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  let selected = initialDate;

  const paint = () => {
    const year = cursor.getFullYear(), month = cursor.getMonth();
    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstOffset }, () => '<span class="journal-calendar-blank"></span>');
    for (let day = 1; day <= days; day += 1) {
      const dateKey = keyFor(new Date(year, month, day));
      const dayEntries = entries.filter(entry => entry.entryDate === dateKey);
      const mood = dayEntries.find(entry => entry.mood)?.mood;
      cells.push(`<button type="button" class="journal-calendar-day${dateKey === todayValue() ? ' is-today' : ''}${dateKey === selected ? ' is-selected' : ''}${dayEntries.length ? ' has-entry' : ''}${mood ? ` mood-${mood}` : ''}" data-calendar-date="${dateKey}" aria-label="${dateKey}${dayEntries.length ? `，${dayEntries.length}篇手记` : '，没有手记'}"><b>${day}</b>${dayEntries.length ? `<i aria-hidden="true"></i><small>${dayEntries.length}</small>` : ''}</button>`);
    }
    root.innerHTML = `<section class="journal-calendar"><header><button type="button" data-calendar-step="-1" aria-label="上一个月">‹</button><h2>${year}年${month + 1}月</h2><button type="button" data-calendar-step="1" aria-label="下一个月">›</button></header><div class="journal-calendar-week">${['一','二','三','四','五','六','日'].map(day => `<span>${day}</span>`).join('')}</div><div class="journal-calendar-grid">${cells.join('')}</div><div data-calendar-detail>${dayDetail(selected, entries)}</div></section>`;
    root.querySelectorAll('[data-calendar-step]').forEach(button => button.onclick = () => {
      cursor = new Date(year, month + Number(button.dataset.calendarStep), 1);
      selected = keyFor(cursor);
      paint();
    });
    root.querySelectorAll('[data-calendar-date]').forEach(button => button.onclick = () => {
      selected = button.dataset.calendarDate;
      root.querySelectorAll('[data-calendar-date]').forEach(day => day.classList.toggle('is-selected', day === button));
      root.querySelector('[data-calendar-detail]').innerHTML = dayDetail(selected, entries);
    });
  };
  paint();
}

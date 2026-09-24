import { formatDateTime, classifyEvent, liveProgress } from './time.js';
import { descriptionToHtml } from './text.js';
import { monThumb } from './images.js';
import { downloadEventICS } from './ics.js';
import { onTick } from './ticker.js';
import { isStarred, toggleStar } from './stars.js';
import { getCategoryColor } from './categoryColors.js';

const DETAIL_SECTIONS = [
  ['features', 'Featured'],
  ['spawns', 'Wild spawns'],
  ['raids', 'Raids'],
  ['research', 'Research rewards'],
  ['eggs', 'Eggs'],
  ['shadow', 'Shadow Pokémon'],
  ['shiny', 'Shiny Pokémon'],
];

let backdrop, sheet, content, closeBtn, grabber;
let stopTick = null;
let onCloseCallback = null;

export function initDetailSheet() {
  backdrop = document.getElementById('sheet-backdrop');
  sheet = document.getElementById('event-sheet');
  content = document.getElementById('sheet-content');
  closeBtn = document.getElementById('sheet-close');
  grabber = document.getElementById('sheet-grabber');

  backdrop.addEventListener('click', closeDetailSheet);
  closeBtn.addEventListener('click', closeDetailSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) closeDetailSheet();
  });

  let dragStartY = null;
  grabber.addEventListener('touchstart', (e) => { dragStartY = e.touches[0].clientY; }, { passive: true });
  grabber.addEventListener('touchmove', (e) => {
    if (dragStartY === null) return;
    const dy = e.touches[0].clientY - dragStartY;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  grabber.addEventListener('touchend', (e) => {
    const dy = (e.changedTouches[0].clientY - dragStartY) || 0;
    sheet.style.transform = '';
    if (dy > 80) closeDetailSheet();
    dragStartY = null;
  });
}

function renderMonSection(title, list) {
  if (!Array.isArray(list) || !list.length) return null;
  const section = document.createElement('div');
  section.className = 'detail-section';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);
  const row = document.createElement('div');
  row.className = 'mon-chip-row';
  for (const mon of list) {
    const chip = document.createElement('span');
    chip.className = 'mon-chip';
    chip.appendChild(monThumb(mon));
    const label = document.createElement('span');
    label.textContent = (mon.name || '').replace(/ /g, ' ');
    chip.appendChild(label);
    row.appendChild(chip);
  }
  section.appendChild(row);
  return section;
}

export function openDetailSheet(ev, { onClose } = {}) {
  onCloseCallback = onClose || null;
  content.innerHTML = '';
  content.setAttribute('tabindex', '-1');

  if (ev.bannerUrl) {
    const img = document.createElement('img');
    img.className = 'detail-banner';
    img.alt = '';
    img.src = ev.bannerUrl;
    img.onerror = () => img.remove();
    content.appendChild(img);
  }

  const titleRow = document.createElement('div');
  titleRow.style.display = 'flex';
  titleRow.style.justifyContent = 'space-between';
  titleRow.style.alignItems = 'flex-start';
  titleRow.style.gap = '10px';

  const titleWrap = document.createElement('div');
  const catEl = document.createElement('div');
  catEl.className = 'detail-cat';
  catEl.style.setProperty('--cat-color', getCategoryColor(ev.category));
  catEl.textContent = ev.category;
  const titleEl = document.createElement('h2');
  titleEl.className = 'detail-title';
  titleEl.id = 'sheet-title';
  titleEl.textContent = ev.title;
  titleWrap.appendChild(catEl);
  titleWrap.appendChild(titleEl);

  const starBtn = document.createElement('button');
  starBtn.className = 'star-btn' + (isStarred(ev.id) ? ' is-starred' : '');
  starBtn.type = 'button';
  starBtn.setAttribute('aria-label', 'Toggle star');
  starBtn.textContent = isStarred(ev.id) ? '★' : '☆';
  starBtn.addEventListener('click', () => {
    const starred = toggleStar(ev.id);
    starBtn.classList.toggle('is-starred', starred);
    starBtn.textContent = starred ? '★' : '☆';
  });

  titleRow.appendChild(titleWrap);
  titleRow.appendChild(starBtn);
  content.appendChild(titleRow);

  const timeBlock = document.createElement('div');
  timeBlock.className = 'detail-time-block';
  timeBlock.innerHTML = `
    <div class="detail-time-row"><span>Starts</span><strong>${formatDateTime(ev.start)}</strong></div>
    <div class="detail-time-row"><span>Ends</span><strong>${formatDateTime(ev.end)}</strong></div>
  `;
  const note = document.createElement('div');
  note.className = 'detail-time-note';
  note.textContent = ev.isLocalTime
    ? 'Local time: starts at this hour wherever you are.'
    : 'Same moment worldwide, shown in your time zone.';
  timeBlock.appendChild(note);

  const countdownEl = document.createElement('div');
  countdownEl.className = 'detail-countdown';
  timeBlock.appendChild(countdownEl);
  const progressTrack = document.createElement('div');
  progressTrack.className = 'progress-track';
  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressTrack.appendChild(progressFill);
  progressTrack.hidden = true;
  timeBlock.appendChild(progressTrack);
  content.appendChild(timeBlock);

  function updateCountdown(now) {
    const cls = classifyEvent(ev.start, ev.end, now);
    countdownEl.textContent = cls.label;
    countdownEl.classList.toggle('is-live', cls.state === 'live');
    countdownEl.classList.toggle('is-urgent', !!cls.urgent);
    const progress = liveProgress(ev.start, ev.end, now);
    if (progress === null) {
      progressTrack.hidden = true;
    } else {
      progressTrack.hidden = false;
      progressFill.style.width = `${Math.round(progress * 100)}%`;
    }
  }
  updateCountdown(new Date());
  if (stopTick) stopTick();
  stopTick = onTick(updateCountdown);

  if (ev.description) {
    const desc = document.createElement('div');
    desc.className = 'detail-desc';
    desc.innerHTML = descriptionToHtml(ev.description);
    content.appendChild(desc);
  }

  const details = ev.details || {};
  if (Array.isArray(details.bonuses) && details.bonuses.length) {
    const section = document.createElement('div');
    section.className = 'detail-section';
    const h3 = document.createElement('h3');
    h3.textContent = 'Bonuses';
    section.appendChild(h3);
    const ul = document.createElement('ul');
    ul.className = 'bonus-list';
    for (const b of details.bonuses) {
      const li = document.createElement('li');
      li.textContent = b;
      ul.appendChild(li);
    }
    section.appendChild(ul);
    content.appendChild(section);
  }

  for (const [key, label] of DETAIL_SECTIONS) {
    const section = renderMonSection(label, details[key]);
    if (section) content.appendChild(section);
  }

  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  if (ev.articleUrl) {
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = ev.articleUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Read on LeekDuck';
    actions.appendChild(link);
  }
  const icsBtn = document.createElement('button');
  icsBtn.className = 'btn btn-primary';
  icsBtn.type = 'button';
  icsBtn.textContent = 'Add to calendar';
  icsBtn.addEventListener('click', () => downloadEventICS(ev));
  actions.appendChild(icsBtn);
  content.appendChild(actions);

  backdrop.hidden = false;
  sheet.hidden = false;
  sheet.setAttribute('aria-labelledby', 'sheet-title');
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
}

export function closeDetailSheet() {
  if (sheet.hidden) return;
  backdrop.hidden = true;
  sheet.hidden = true;
  document.body.style.overflow = '';
  if (stopTick) { stopTick(); stopTick = null; }
  if (onCloseCallback) { onCloseCallback(); onCloseCallback = null; }
}

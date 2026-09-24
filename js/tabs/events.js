import { classifyEvent, liveProgress, dayLabel, formatTimeOnly, formatDateTime } from '../time.js';
import { getCategoryColor } from '../categoryColors.js';
import { monThumb } from '../images.js';
import { isStarred, toggleStar } from '../stars.js';
import { onTick } from '../ticker.js';
import { openDetailSheet } from '../detail.js';
import { normalizeSearchText } from '../text.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function pickFeaturedMons(details) {
  const order = ['features', 'spawns', 'raids', 'research', 'eggs', 'shadow', 'shiny'];
  for (const key of order) {
    if (Array.isArray(details?.[key]) && details[key].length) return details[key];
  }
  return [];
}

function timeRangeText(ev) {
  if (!ev.start && !ev.end) return 'Date not announced';
  if (ev.start && ev.end) return `${formatTimeOnly(ev.start)} – ${formatDateTime(ev.end)}`;
  if (ev.start) return `Starts ${formatDateTime(ev.start)}`;
  return `Ends ${formatDateTime(ev.end)}`;
}

export function createEventsTab({ listContainer, chipsContainer, searchInput, starOnlyToggle }) {
  let allEvents = [];
  let selectedCategories = new Set();
  let unsubscribers = [];

  function clearTicks() {
    unsubscribers.forEach((fn) => fn());
    unsubscribers = [];
  }

  function buildChips() {
    const categories = [...new Set(allEvents.map((e) => e.category))].sort();
    chipsContainer.innerHTML = '';

    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = 'chip' + (selectedCategories.size === 0 ? ' is-active' : '');
    allChip.textContent = 'All';
    allChip.addEventListener('click', () => {
      selectedCategories.clear();
      buildChips();
      renderList();
    });
    chipsContainer.appendChild(allChip);

    for (const cat of categories) {
      const chip = document.createElement('button');
      chip.type = 'button';
      const active = selectedCategories.has(cat);
      chip.className = 'chip' + (active ? ' is-active' : '');
      chip.style.setProperty('--chip-color', getCategoryColor(cat));
      chip.textContent = cat;
      chip.setAttribute('aria-pressed', String(active));
      chip.addEventListener('click', () => {
        if (selectedCategories.has(cat)) selectedCategories.delete(cat);
        else selectedCategories.add(cat);
        buildChips();
        renderList();
      });
      chipsContainer.appendChild(chip);
    }
  }

  function matchesFilters(ev, searchText) {
    if (starOnlyToggle.checked && !isStarred(ev.id)) return false;
    if (selectedCategories.size && !selectedCategories.has(ev.category)) return false;
    if (searchText) {
      const haystack = normalizeSearchText(ev.title + ' ' + ev.category);
      if (!haystack.includes(searchText)) return false;
    }
    return true;
  }

  function buildRow(ev, cls) {
    // A <div role="button"> rather than a real <button>: the star control
    // below is a real nested <button>, and interactive content inside a
    // <button> is invalid HTML / confuses assistive tech.
    const row = document.createElement('div');
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.className = 'event-row';
    if (cls.state === 'live') row.classList.add(cls.urgent ? 'is-urgent' : 'is-live');

    const bar = document.createElement('span');
    bar.className = 'event-row__cat-bar';
    bar.style.setProperty('--cat-color', getCategoryColor(ev.category));
    row.appendChild(bar);

    const body = document.createElement('span');
    body.className = 'event-row__body';

    const top = document.createElement('span');
    top.className = 'event-row__top';
    const catSpan = document.createElement('span');
    catSpan.className = 'event-row__cat';
    catSpan.style.setProperty('--cat-color', getCategoryColor(ev.category));
    catSpan.textContent = ev.category;
    top.appendChild(catSpan);
    body.appendChild(top);

    const title = document.createElement('span');
    title.className = 'event-row__title';
    title.textContent = ev.title;
    body.appendChild(title);

    const timeEl = document.createElement('span');
    timeEl.className = 'event-row__time';
    timeEl.textContent = timeRangeText(ev);
    body.appendChild(timeEl);

    const countdownEl = document.createElement('span');
    countdownEl.className = 'event-row__countdown';
    body.appendChild(countdownEl);

    const progressTrack = document.createElement('span');
    progressTrack.className = 'progress-track';
    progressTrack.style.display = 'block';
    const progressFill = document.createElement('span');
    progressFill.className = 'progress-fill';
    progressFill.style.display = 'block';
    progressTrack.appendChild(progressFill);
    progressTrack.hidden = true;
    body.appendChild(progressTrack);

    function update(now) {
      const c = classifyEvent(ev.start, ev.end, now);
      countdownEl.textContent = c.label;
      countdownEl.classList.toggle('is-live', c.state === 'live');
      countdownEl.classList.toggle('is-urgent', !!c.urgent);
      const progress = liveProgress(ev.start, ev.end, now);
      if (progress === null) {
        progressTrack.hidden = true;
      } else {
        progressTrack.hidden = false;
        progressFill.style.width = `${Math.round(progress * 100)}%`;
      }
    }
    update(new Date());
    unsubscribers.push(onTick(update));

    row.appendChild(body);

    const sprites = document.createElement('span');
    sprites.className = 'event-row__sprites';
    const featured = pickFeaturedMons(ev.details).slice(0, 4);
    for (const mon of featured) sprites.appendChild(monThumb(mon));
    row.appendChild(sprites);

    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.className = 'star-btn' + (isStarred(ev.id) ? ' is-starred' : '');
    starBtn.setAttribute('aria-label', 'Toggle star');
    starBtn.textContent = isStarred(ev.id) ? '★' : '☆';
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const starred = toggleStar(ev.id);
      starBtn.classList.toggle('is-starred', starred);
      starBtn.textContent = starred ? '★' : '☆';
      if (starOnlyToggle.checked && !starred) renderList();
    });
    row.appendChild(starBtn);

    row.setAttribute('aria-label', `${ev.title}, ${ev.category}`);
    row.addEventListener('click', () => openDetailSheet(ev));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailSheet(ev); }
    });
    return row;
  }

  function sectionHeading(text, count, urgent) {
    const h = document.createElement('div');
    h.className = 'section-heading' + (urgent ? ' is-urgent' : '');
    h.innerHTML = `<span>${text}</span><span class="count">${count}</span>`;
    return h;
  }

  function makeList() {
    const list = document.createElement('div');
    list.className = 'event-list';
    return list;
  }

  function renderList() {
    clearTicks();
    listContainer.innerHTML = '';
    const now = new Date();
    const searchText = normalizeSearchText(searchInput.value.trim());

    const filtered = allEvents.filter((ev) => matchesFilters(ev, searchText));
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = allEvents.length ? 'No events match your filters.' : 'No event data yet.';
      listContainer.appendChild(empty);
      return;
    }

    const endingSoon = [];
    const liveNow = [];
    const upcoming = [];
    const unscheduled = [];
    const recentlyEnded = [];

    for (const ev of filtered) {
      const cls = classifyEvent(ev.start, ev.end, now);
      if (cls.state === 'live') {
        (cls.urgent ? endingSoon : liveNow).push(ev);
      } else if (cls.state === 'upcoming') {
        upcoming.push(ev);
      } else if (cls.state === 'unknown') {
        unscheduled.push(ev);
      } else if (cls.state === 'ended') {
        if (now - ev.end <= SEVEN_DAYS_MS) recentlyEnded.push(ev);
      }
    }

    endingSoon.sort((a, b) => a.end - b.end);
    liveNow.sort((a, b) => a.end - b.end);
    upcoming.sort((a, b) => a.start - b.start);
    recentlyEnded.sort((a, b) => b.end - a.end);

    if (endingSoon.length) {
      listContainer.appendChild(sectionHeading('Ending within 24 hours', endingSoon.length, true));
      const list = makeList();
      endingSoon.forEach((ev) => list.appendChild(buildRow(ev, classifyEvent(ev.start, ev.end, now))));
      listContainer.appendChild(list);
    }

    if (liveNow.length) {
      listContainer.appendChild(sectionHeading('Live now', liveNow.length));
      const list = makeList();
      liveNow.forEach((ev) => list.appendChild(buildRow(ev, classifyEvent(ev.start, ev.end, now))));
      listContainer.appendChild(list);
    }

    if (upcoming.length || unscheduled.length) {
      listContainer.appendChild(sectionHeading('Upcoming', upcoming.length + unscheduled.length));
      let lastLabel = null;
      for (const ev of upcoming) {
        const label = dayLabel(ev.start, now);
        if (label !== lastLabel) {
          const dh = document.createElement('div');
          dh.className = 'day-heading';
          dh.textContent = label;
          listContainer.appendChild(dh);
          lastLabel = label;
        }
        const list = makeList();
        list.appendChild(buildRow(ev, classifyEvent(ev.start, ev.end, now)));
        listContainer.appendChild(list);
      }
      if (unscheduled.length) {
        const dh = document.createElement('div');
        dh.className = 'day-heading';
        dh.textContent = 'Unscheduled';
        listContainer.appendChild(dh);
        const list = makeList();
        unscheduled.forEach((ev) => list.appendChild(buildRow(ev, classifyEvent(ev.start, ev.end, now))));
        listContainer.appendChild(list);
      }
    }

    if (recentlyEnded.length) {
      const details = document.createElement('details');
      details.className = 'section-collapse';
      const summary = document.createElement('summary');
      summary.innerHTML = `<span class="section-heading" style="margin:22px 0 8px"><span>Recently ended</span><span class="count">${recentlyEnded.length}</span><span class="chev">›</span></span>`;
      details.appendChild(summary);
      const list = makeList();
      recentlyEnded.forEach((ev) => list.appendChild(buildRow(ev, classifyEvent(ev.start, ev.end, now))));
      details.appendChild(list);
      listContainer.appendChild(details);
    }

    if (!endingSoon.length && !liveNow.length && !upcoming.length && !unscheduled.length && !recentlyEnded.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Nothing to show right now.';
      listContainer.appendChild(empty);
    }
  }

  searchInput.addEventListener('input', renderList);
  starOnlyToggle.addEventListener('change', renderList);

  return {
    setEvents(events) {
      allEvents = events;
      buildChips();
      renderList();
    },
    regroup: renderList,
  };
}

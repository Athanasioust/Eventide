import { loadData, normalizeEvents } from './data.js';
import { tick } from './ticker.js';
import { initDetailSheet } from './detail.js';
import { createEventsTab } from './tabs/events.js';
import { renderRaidsTab } from './tabs/raids.js';
import { renderResearchTab } from './tabs/research.js';
import { renderEggsTab } from './tabs/eggs.js';
import { renderRocketTab } from './tabs/rocket.js';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const REGROUP_INTERVAL_MS = 60 * 1000;

const statusLine = document.getElementById('status-line');
const refreshBtn = document.getElementById('refresh-btn');

let latestRaw = null;

const eventsTab = createEventsTab({
  listContainer: document.getElementById('events-content'),
  chipsContainer: document.getElementById('category-chips'),
  searchInput: document.getElementById('events-search'),
  starOnlyToggle: document.getElementById('star-only'),
});

const researchSearch = document.getElementById('research-search');
researchSearch.addEventListener('input', () => {
  if (latestRaw) renderResearchTab(document.getElementById('research-content'), latestRaw.researchTasks, researchSearch.value);
});

function formatUpdatedAt(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function setStatus(text, isOffline) {
  statusLine.textContent = text;
  statusLine.classList.toggle('is-offline', !!isOffline);
}

function renderAll(raw) {
  latestRaw = raw;
  eventsTab.setEvents(normalizeEvents(raw.events));
  renderRaidsTab(document.getElementById('raids-content'), raw.raidBosses);
  renderResearchTab(document.getElementById('research-content'), raw.researchTasks, researchSearch.value);
  renderEggsTab(document.getElementById('eggs-content'), raw.eggPool);
  renderRocketTab(document.getElementById('rocket-content'), raw.rocketLineups);
}

async function refresh({ isManual = false } = {}) {
  refreshBtn.classList.add('is-loading');
  refreshBtn.disabled = true;
  try {
    const result = await loadData({
      onCacheHit: (cached) => {
        renderAll(cached.raw);
        setStatus(`Showing cached data from ${formatUpdatedAt(cached.fetchedAt)}…`, false);
      },
    });
    renderAll(result.raw);
    if (result.isOffline) {
      setStatus(`Offline — showing data from ${formatUpdatedAt(result.fetchedAt)}`, true);
    } else {
      setStatus(`Updated ${formatUpdatedAt(result.fetchedAt)}`, false);
    }
  } catch (e) {
    console.error('Eventide: failed to load data', e);
    setStatus('Could not load data and no cached copy is available.', true);
  } finally {
    refreshBtn.classList.remove('is-loading');
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', () => refresh({ isManual: true }));

function initTabs() {
  const buttons = document.querySelectorAll('.tab-bar__btn');
  const panels = document.querySelectorAll('.tab-panel');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tabTarget;
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      panels.forEach((p) => { p.hidden = p.dataset.tab !== target; });
      document.getElementById('main').scrollTo?.({ top: 0 });
    });
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
    });
  }
}

function init() {
  initTabs();
  initDetailSheet();
  registerServiceWorker();
  refresh();

  setInterval(() => tick(new Date()), 1000);
  setInterval(() => eventsTab.regroup(), REGROUP_INTERVAL_MS);
  setInterval(() => refresh(), REFRESH_INTERVAL_MS);
}

init();

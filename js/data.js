import { parseEventDate } from './time.js';

const BASE_URL = 'https://raw.githubusercontent.com/zhenga8533/leak-duck/data/';
const ENDPOINTS = {
  events: 'events.json',
  raidBosses: 'raid_bosses.json',
  researchTasks: 'research_tasks.json',
  eggPool: 'egg_pool.json',
  rocketLineups: 'rocket_lineups.json',
};

const CACHE_KEY = 'eventide:cache:v1';
const FETCH_TIMEOUT_MS = 15000;

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Flatten the {category: [event, ...]} map into a single array with computed dates + a stable id. */
export function normalizeEvents(rawEventsByCategory) {
  const out = [];
  if (!rawEventsByCategory || typeof rawEventsByCategory !== 'object') return out;
  for (const [categoryKey, list] of Object.entries(rawEventsByCategory)) {
    if (!Array.isArray(list)) continue;
    for (const ev of list) {
      const isLocalTime = !!ev.is_local_time;
      const start = parseEventDate(ev.start_time, isLocalTime);
      const end = parseEventDate(ev.end_time, isLocalTime);
      const category = ev.category || categoryKey;
      const id = hashId(`${category}|${ev.title}|${ev.start_time}|${ev.end_time}`);
      out.push({
        id,
        title: ev.title || 'Untitled event',
        articleUrl: ev.article_url || null,
        bannerUrl: ev.banner_url || null,
        category,
        description: ev.description || '',
        isLocalTime,
        startRaw: ev.start_time ?? null,
        endRaw: ev.end_time ?? null,
        start,
        end,
        details: ev.details || {},
      });
    }
  }
  return out;
}

async function fetchJson(path, signal) {
  const res = await fetch(BASE_URL + path, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/** Fetch every endpoint; all-or-nothing so we never mix stale+fresh data across files. */
export async function fetchAllFresh() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const entries = Object.entries(ENDPOINTS);
    const results = await Promise.all(entries.map(([, path]) => fetchJson(path, controller.signal)));
    const raw = {};
    entries.forEach(([key], i) => { raw[key] = results[i]; });
    return raw;
  } finally {
    clearTimeout(timer);
  }
}

export function saveCache(raw) {
  const payload = { raw, fetchedAt: Date.now() };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    // localStorage full or unavailable (e.g. private mode) — non-fatal.
    console.warn('Eventide: could not persist cache', e);
  }
}

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Load whatever's cached immediately, then try a fresh fetch.
 * Resolves with { raw, fetchedAt, isOffline } — isOffline true means the
 * fetch failed and we fell back to (or stayed on) the cache.
 */
export async function loadData({ onCacheHit } = {}) {
  const cached = loadCache();
  if (cached && onCacheHit) onCacheHit(cached);

  try {
    const raw = await fetchAllFresh();
    saveCache(raw);
    return { raw, fetchedAt: Date.now(), isOffline: false };
  } catch (e) {
    if (cached) return { raw: cached.raw, fetchedAt: cached.fetchedAt, isOffline: true };
    throw e;
  }
}

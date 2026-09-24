// Pokemon sprite resolution: leekduck cdn first, PokeAPI sprite by dex as a
// fallback, then a text chip when nothing loads (items, mega energy, or a
// genuinely broken URL).

const DEX_PATTERNS = [/\/pm(\d+)\./, /pokemon_icon_(\d+)_/, /poke_capture_(\d+)_/];

export function extractDex(url) {
  if (!url) return null;
  for (const re of DEX_PATTERNS) {
    const m = url.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function pokeApiSprite(dex) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

export function normalizeName(name) {
  return (name || '').replace(/ /g, ' ').trim();
}

function abbreviate(name) {
  const clean = normalizeName(name);
  if (!clean) return '?';
  const words = clean.split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 4);
  return words.map(w => w[0]).join('').slice(0, 4).toUpperCase();
}

function makeFallbackChip(name, extraClass) {
  const span = document.createElement('span');
  span.className = 'sprite-fallback' + (extraClass ? ' ' + extraClass : '');
  span.textContent = abbreviate(name);
  span.title = normalizeName(name);
  return span;
}

/**
 * Build an <img> (or fallback chip span if there's no usable URL at all)
 * with a leekduck -> PokeAPI -> text-chip fallback chain wired via onerror.
 */
export function createSpriteNode(name, assetUrl, extraClass) {
  const displayName = normalizeName(name);
  if (!assetUrl) return makeFallbackChip(displayName, extraClass);

  const dex = extractDex(assetUrl);
  const img = document.createElement('img');
  img.alt = displayName;
  img.loading = 'lazy';
  img.decoding = 'async';
  if (extraClass) img.className = extraClass;

  let stage = 0;
  img.addEventListener('error', function onError() {
    stage += 1;
    if (stage === 1 && dex) {
      img.src = pokeApiSprite(dex);
      return;
    }
    img.removeEventListener('error', onError);
    const fallback = makeFallbackChip(displayName, extraClass);
    if (img.parentNode) img.replaceWith(fallback);
  });
  img.src = assetUrl;
  return img;
}

/**
 * Wraps a sprite node with an optional shiny-available marker.
 * `mon` is any {name, asset_url, shiny_available} shaped object.
 */
export function monThumb(mon, extraClass) {
  const wrap = document.createElement('span');
  wrap.className = 'thumb-wrap';
  wrap.appendChild(createSpriteNode(mon.name, mon.asset_url, extraClass));
  if (mon.shiny_available) {
    const badge = document.createElement('span');
    badge.className = 'shiny-dot';
    badge.title = 'Shiny available';
    badge.setAttribute('aria-label', 'Shiny available');
    badge.textContent = '✨';
    wrap.appendChild(badge);
  }
  return wrap;
}

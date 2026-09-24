import { monThumb } from '../images.js';

function cpRangeText(range) {
  if (!range || range.min == null || range.max == null) return null;
  return `${range.min.toLocaleString()}–${range.max.toLocaleString()}`;
}

function buildBossCard(boss) {
  const card = document.createElement('div');
  card.className = 'mon-card';

  if (boss.shiny_available) {
    const badge = document.createElement('span');
    badge.className = 'shiny-badge';
    badge.title = 'Shiny available';
    badge.setAttribute('aria-label', 'Shiny available');
    badge.textContent = '✨';
    card.appendChild(badge);
  }

  card.appendChild(monThumb({ name: boss.name, asset_url: boss.asset_url, shiny_available: false }));

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = boss.name;
  card.appendChild(name);

  if (Array.isArray(boss.types) && boss.types.length) {
    const types = document.createElement('div');
    types.className = 'types';
    for (const t of boss.types) {
      const chip = document.createElement('span');
      chip.className = 'type-chip';
      chip.textContent = t;
      types.appendChild(chip);
    }
    card.appendChild(types);
  }

  const cp = cpRangeText(boss.cp_range);
  if (cp) {
    const cpEl = document.createElement('div');
    cpEl.className = 'cp-range';
    cpEl.innerHTML = `CP <strong>${cp}</strong>`;
    card.appendChild(cpEl);
  }
  const boosted = cpRangeText(boss.boosted_cp_range);
  if (boosted) {
    const boostedEl = document.createElement('div');
    boostedEl.className = 'cp-range';
    boostedEl.innerHTML = `Boosted <strong>${boosted}</strong>`;
    card.appendChild(boostedEl);
  }

  return card;
}

export function renderRaidsTab(container, raidBossesByTier) {
  container.innerHTML = '';
  if (!raidBossesByTier || !Object.keys(raidBossesByTier).length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No raid boss data yet.';
    container.appendChild(empty);
    return;
  }

  for (const [tier, bosses] of Object.entries(raidBossesByTier)) {
    if (!Array.isArray(bosses) || !bosses.length) continue;
    const block = document.createElement('div');
    block.className = 'group-block';
    const title = document.createElement('h2');
    title.className = 'group-title';
    title.textContent = tier;
    block.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    for (const boss of bosses) grid.appendChild(buildBossCard(boss));
    block.appendChild(grid);
    container.appendChild(block);
  }
}

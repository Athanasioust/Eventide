import { monThumb } from '../images.js';

function buildEggCard(mon) {
  const card = document.createElement('div');
  card.className = 'mon-card egg-card';

  if (mon.shiny_available) {
    const badge = document.createElement('span');
    badge.className = 'shiny-badge';
    badge.title = 'Shiny available';
    badge.setAttribute('aria-label', 'Shiny available');
    badge.textContent = '✨';
    card.appendChild(badge);
  }

  card.appendChild(monThumb({ name: mon.name, asset_url: mon.asset_url, shiny_available: false }));
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = mon.name;
  card.appendChild(name);

  return card;
}

export function renderEggsTab(container, eggPoolByGroup) {
  container.innerHTML = '';
  if (!eggPoolByGroup || !Object.keys(eggPoolByGroup).length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No egg data yet.';
    container.appendChild(empty);
    return;
  }

  for (const [group, mons] of Object.entries(eggPoolByGroup)) {
    if (!Array.isArray(mons) || !mons.length) continue;
    const block = document.createElement('div');
    block.className = 'group-block';
    const title = document.createElement('h2');
    title.className = 'group-title';
    title.textContent = group;
    block.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'card-grid';
    for (const mon of mons) grid.appendChild(buildEggCard(mon));
    block.appendChild(grid);
    container.appendChild(block);
  }
}

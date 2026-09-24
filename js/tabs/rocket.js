import { monThumb, normalizeName } from '../images.js';

function buildSlot(slot) {
  const el = document.createElement('div');
  el.className = 'rocket-slot' + (slot.is_encounter ? ' is-catchable' : '');

  const label = document.createElement('div');
  label.className = 'slot-label';
  label.textContent = `Slot ${slot.slot}`;
  el.appendChild(label);

  const mons = document.createElement('div');
  mons.className = 'rocket-slot-mons';
  for (const mon of slot.pokemons || []) mons.appendChild(monThumb(mon));
  el.appendChild(mons);

  const names = document.createElement('div');
  names.className = 'mon-name';
  names.textContent = (slot.pokemons || []).map((m) => normalizeName(m.name)).join(' or ');
  el.appendChild(names);

  if (slot.is_encounter) {
    const catchLabel = document.createElement('div');
    catchLabel.className = 'catch-label';
    catchLabel.textContent = 'Catchable';
    el.appendChild(catchLabel);
  }

  return el;
}

export function renderRocketTab(container, lineupsByName) {
  container.innerHTML = '';
  if (!lineupsByName || !Object.keys(lineupsByName).length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No Team GO Rocket data yet.';
    container.appendChild(empty);
    return;
  }

  for (const [name, slots] of Object.entries(lineupsByName)) {
    const card = document.createElement('div');
    card.className = 'rocket-card';
    const title = document.createElement('div');
    title.className = 'name';
    title.textContent = normalizeName(name);
    card.appendChild(title);

    const slotsRow = document.createElement('div');
    slotsRow.className = 'rocket-slots';
    for (const slot of slots || []) slotsRow.appendChild(buildSlot(slot));
    card.appendChild(slotsRow);

    container.appendChild(card);
  }
}

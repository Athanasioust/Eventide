import { createSpriteNode, monThumb } from '../images.js';
import { normalizeSearchText } from '../text.js';

function buildRewardChip(reward) {
  const chip = document.createElement('span');
  chip.className = 'reward-chip';

  if (reward.type === 'encounter') {
    chip.appendChild(monThumb(reward));
    const label = document.createElement('span');
    const cp = reward.cp_range && reward.cp_range.min != null && reward.cp_range.max != null
      ? ` (CP ${reward.cp_range.min}–${reward.cp_range.max})`
      : '';
    label.textContent = `${(reward.name || '').replace(/ /g, ' ')}${cp}`;
    chip.appendChild(label);
  } else {
    chip.appendChild(createSpriteNode(reward.name, reward.asset_url));
    const label = document.createElement('span');
    const qty = reward.quantity != null ? `${reward.name} ×${reward.quantity}` : reward.name;
    label.textContent = qty;
    chip.appendChild(label);
  }
  return chip;
}

function taskMatchesSearch(task, searchText) {
  if (!searchText) return true;
  if (normalizeSearchText(task.task).includes(searchText)) return true;
  return (task.rewards || []).some((r) => normalizeSearchText(r.name).includes(searchText));
}

export function renderResearchTab(container, researchByGroup, searchText) {
  container.innerHTML = '';
  if (!researchByGroup || !Object.keys(researchByGroup).length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No research data yet.';
    container.appendChild(empty);
    return;
  }

  const normalizedSearch = normalizeSearchText(searchText);
  let anyShown = false;

  for (const [group, tasks] of Object.entries(researchByGroup)) {
    if (!Array.isArray(tasks) || !tasks.length) continue;
    const visible = tasks.filter((t) => taskMatchesSearch(t, normalizedSearch));
    if (!visible.length) continue;
    anyShown = true;

    const block = document.createElement('div');
    block.className = 'group-block';
    const title = document.createElement('h2');
    title.className = 'group-title';
    title.textContent = group;
    block.appendChild(title);

    for (const task of visible) {
      const card = document.createElement('div');
      card.className = 'task-card';
      const text = document.createElement('div');
      text.className = 'task-text';
      text.textContent = task.task;
      card.appendChild(text);

      if (Array.isArray(task.rewards) && task.rewards.length) {
        const row = document.createElement('div');
        row.className = 'reward-row';
        for (const reward of task.rewards) row.appendChild(buildRewardChip(reward));
        card.appendChild(row);
      }
      block.appendChild(card);
    }
    container.appendChild(block);
  }

  if (!anyShown) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tasks match your search.';
    container.appendChild(empty);
  }
}

const KEY = 'eventide:stars:v1';

function readSet() {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

let stars = readSet();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...stars]));
  } catch (e) {
    console.warn('Eventide: could not persist stars', e);
  }
}

export function isStarred(id) {
  return stars.has(id);
}

export function toggleStar(id) {
  if (stars.has(id)) stars.delete(id);
  else stars.add(id);
  persist();
  return stars.has(id);
}

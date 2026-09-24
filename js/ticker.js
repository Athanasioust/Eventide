// Simple pub-sub so multiple views can update their own countdown text
// every second without re-rendering the whole page.
const callbacks = new Set();

export function onTick(fn) {
  callbacks.add(fn);
  return () => callbacks.delete(fn);
}

export function tick(now) {
  for (const fn of callbacks) fn(now);
}

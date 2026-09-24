// Deterministic color assignment so any category name (including ones added
// to the feed after this app was written) still gets a stable, distinct color.
const PALETTE = [
  '#E3350D', '#2E6BE6', '#1F9D55', '#C79A2E', '#9B51E0',
  '#E0507A', '#0EA5A5', '#D97706', '#3B82F6', '#7C3AED',
  '#059669', '#DC2626', '#0284C7', '#CA8A04', '#DB2777'
];

const cache = new Map();

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getCategoryColor(category) {
  const key = category || 'Unknown';
  if (cache.has(key)) return cache.get(key);
  const color = PALETTE[hashString(key) % PALETTE.length];
  cache.set(key, color);
  return color;
}

function pad(n) { return String(n).padStart(2, '0'); }

// UTC instant, used for is_local_time=false events and DTSTAMP.
function toICSUtc(date) {
  return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) +
    'T' + pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + 'Z';
}

// Floating local time (no Z, no TZID): matches "this wall-clock hour
// wherever you are", which is what is_local_time=true events mean.
function toICSFloating(date) {
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) +
    'T' + pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds());
}

function escapeICS(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function sanitizeFilename(str) {
  return (str || 'event').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'event';
}

export function downloadEventICS(ev) {
  const now = new Date();
  const fmt = ev.isLocalTime ? toICSFloating : toICSUtc;
  const dtstart = ev.start ? fmt(ev.start) : fmt(now);
  const dtend = ev.end ? fmt(ev.end) : dtstart;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eventide//Pokemon GO Tracker//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@eventide.local`,
    `DTSTAMP:${toICSUtc(now)}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${escapeICS(ev.description)}`);
  if (ev.articleUrl) lines.push(`URL:${ev.articleUrl}`);
  lines.push(`CATEGORIES:${escapeICS(ev.category || '')}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(ev.title)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

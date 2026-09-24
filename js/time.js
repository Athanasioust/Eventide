// Time parsing and formatting. See spec: is_local_time distinguishes
// wall-clock-everywhere strings from true-UTC-instant epoch seconds.

const LOCAL_STRING_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;

/**
 * Build a Date from a raw event time value + its is_local_time flag.
 * Returns null when the value is missing/unparseable so callers can
 * render "date not announced" instead of crashing.
 */
export function parseEventDate(value, isLocalTime) {
  if (value === null || value === undefined || value === '') return null;

  if (isLocalTime) {
    if (typeof value === 'string') {
      const m = value.match(LOCAL_STRING_RE);
      if (m) {
        const [, y, mo, d, h, mi, s] = m.map(Number);
        return new Date(y, mo - 1, d, h, mi, s);
      }
    }
    // Defensive fallback if a "local" value ever arrives as a number.
    if (typeof value === 'number') return new Date(value * 1000);
    const generic = new Date(value);
    return isNaN(generic) ? null : generic;
  }

  // is_local_time === false: same instant worldwide, given as Unix seconds.
  let num = value;
  if (typeof value === 'string') {
    num = Number(value);
    if (Number.isNaN(num)) {
      const generic = new Date(value);
      return isNaN(generic) ? null : generic;
    }
  }
  if (typeof num !== 'number' || Number.isNaN(num)) return null;
  return new Date(num * 1000);
}

export function formatDateTime(date) {
  if (!date) return 'Not announced';
  return date.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

export function formatTimeOnly(date) {
  if (!date) return '--';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function dayLabel(date, now = new Date()) {
  if (!date) return 'Unscheduled';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Compact "5h 12m" / "2d 3h" / "42m" / "<1m" style duration string. */
export function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return '<1m';
}

/**
 * Given start/end Dates (either may be null) and "now", classify the event
 * and produce the label shown in lists/detail views.
 */
export function classifyEvent(start, end, now = new Date()) {
  const hasStart = start instanceof Date && !isNaN(start);
  const hasEnd = end instanceof Date && !isNaN(end);

  if (hasEnd && end.getTime() <= now.getTime()) {
    return { state: 'ended', label: `Ended ${formatDuration(now - end)} ago` };
  }
  if (hasStart && start.getTime() > now.getTime()) {
    return { state: 'upcoming', label: `Starts in ${formatDuration(start - now)}` };
  }
  if (hasEnd) {
    const msLeft = end - now;
    const urgent = msLeft <= 24 * 60 * 60 * 1000;
    return { state: 'live', urgent, label: `Ends in ${formatDuration(msLeft)}` };
  }
  if (hasStart) {
    return { state: 'live', urgent: false, label: 'Live now' };
  }
  return { state: 'unknown', label: 'Date not announced' };
}

export function liveProgress(start, end, now = new Date()) {
  if (!(start instanceof Date) || isNaN(start) || !(end instanceof Date) || isNaN(end)) return null;
  const total = end - start;
  if (total <= 0) return null;
  const elapsed = now - start;
  return Math.min(1, Math.max(0, elapsed / total));
}

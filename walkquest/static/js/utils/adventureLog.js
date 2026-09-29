/**
 * Pure helpers for logging a walk (no Vue, no DOM). The dialog asks only what
 * the walk can't tell us: when, how it felt, who came, and a note. The title,
 * categories and (by default) difficulty come from the walk on the server.
 */

/** How hard it felt: the same five levels the walks are rated on. */
export const FEEL_CHOICES = [
  { key: 'NOVICE WANDERER', label: 'Easy' },
  { key: "GREY'S PATHFINDER", label: 'Easy–moderate' },
  { key: 'TRAIL RANGER', label: 'Moderate' },
  { key: "WARDEN'S ASCENT", label: 'Challenging' },
  { key: 'MASTER WAYFARER', label: 'Strenuous' },
];

export const NOTES_MAX = 500;

/** Today as YYYY-MM-DD in the user's own timezone (not UTC). */
export function localDate(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const hhmm = (time) => (time ? String(time).slice(0, 5) : '');

/** A new log: today, the walk's own difficulty pre-selected, nothing else. */
export function emptyForm(walk, today = localDate()) {
  return {
    date: today,
    timesOn: false,
    startTime: '',
    endTime: '',
    difficulty: walk?.difficulty?.key || '',
    description: '',
    companions: [],
  };
}

/** An existing log, as form values (for editing). */
export function formFromEntry(entry) {
  return {
    date: entry.start_date,
    timesOn: Boolean(entry.start_time || entry.end_time),
    startTime: hhmm(entry.start_time),
    endTime: hhmm(entry.end_time),
    difficulty: entry.difficulty_level || '',
    description: entry.description || '',
    companions: (entry.companions || []).map((c) => c.id),
  };
}

/** Returns `{ field: message }`; empty when the form can be saved. */
export function validate(form, today = localDate()) {
  const errors = {};
  if (!form.date) errors.date = 'Pick the day you walked it.';
  else if (form.date > today) errors.date = "You can't log a walk that hasn't happened yet.";
  if (form.timesOn && form.startTime && form.endTime && form.endTime <= form.startTime) {
    errors.endTime = 'Finish time must be after the start time.';
  }
  if (form.description.length > NOTES_MAX) errors.description = `Keep notes under ${NOTES_MAX} characters.`;
  return errors;
}

function timesOf(form) {
  return {
    start_time: form.timesOn && form.startTime ? form.startTime : null,
    end_time: form.timesOn && form.endTime ? form.endTime : null,
  };
}

/** Body for POST /api/adventures/log. Unset fields are left for the server to default. */
export function buildLogPayload(walk, form) {
  const payload = {
    walk_id: walk.id,
    start_date: form.date,
    description: form.description.trim(),
    companion_ids: [...form.companions],
    ...timesOf(form),
  };
  if (form.difficulty) payload.difficulty_level = form.difficulty;
  return payload;
}

/** Body for PATCH /api/adventures/{id}. */
export function buildUpdatePayload(form) {
  const payload = {
    start_date: form.date,
    description: form.description.trim(),
    companion_ids: [...form.companions],
    ...timesOf(form),
  };
  if (form.difficulty) payload.difficulty_level = form.difficulty;
  return payload;
}

// ── Drafts: kept per walk so closing the dialog (or a session that expired
// mid-way) doesn't lose what was typed. ────────────────────────────────────
const draftKey = (walkId) => `walkquest:log-draft:${walkId}`;

export function saveDraft(storage, walkId, form) {
  try {
    storage.setItem(draftKey(walkId), JSON.stringify(form));
  } catch {
    /* storage unavailable or full: drafts are a convenience */
  }
}

export function loadDraft(storage, walkId) {
  try {
    const raw = storage.getItem(draftKey(walkId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(storage, walkId) {
  try {
    storage.removeItem(draftKey(walkId));
  } catch {
    /* nothing to clear */
  }
}

/** A draft is only worth keeping (and offering back) if it differs from a blank form. */
export function isPristine(form, walk, today = localDate()) {
  return JSON.stringify(form) === JSON.stringify(emptyForm(walk, today));
}

// ── Display ─────────────────────────────────────────────────────────────
/** "Sat 12 Sep 2026" from a YYYY-MM-DD date, without timezone drift. */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDay(isoDate, { withYear = true } = {}) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  // Fixed names rather than Intl, whose short forms differ between engines.
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  return `${weekday} ${day} ${MONTHS[month - 1]}${withYear ? ` ${year}` : ''}`;
}

/** "09:30–12:15", "from 09:30", "until 12:15" or "" for a log's times. */
export function timeRange(entry) {
  const start = hhmm(entry.start_time);
  const end = hhmm(entry.end_time);
  if (start && end) return `${start}–${end}`;
  if (start) return `from ${start}`;
  if (end) return `until ${end}`;
  return '';
}

/** The day of a log, or "Fri 11 Sep – Sat 12 Sep 2026" for one that spans days. */
export function dayRange(entry) {
  if (!entry.end_date || entry.end_date === entry.start_date) return formatDay(entry.start_date);
  return `${formatDay(entry.start_date, { withYear: false })} – ${formatDay(entry.end_date)}`;
}

export function feelLabel(key) {
  return FEEL_CHOICES.find((choice) => choice.key === key)?.label || '';
}

/** The most recent log of a walk (the API lists newest first), or null. */
export function latestLogFor(adventures, walkId) {
  return adventures.find((entry) => entry.walk?.id === walkId) || null;
}

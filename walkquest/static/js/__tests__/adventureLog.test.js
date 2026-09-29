import { describe, expect, it } from 'vitest';
import {
  FEEL_CHOICES,
  NOTES_MAX,
  buildLogPayload,
  buildUpdatePayload,
  clearDraft,
  dayRange,
  emptyForm,
  formFromEntry,
  formatDay,
  isPristine,
  latestLogFor,
  loadDraft,
  localDate,
  saveDraft,
  timeRange,
  validate,
} from '../utils/adventureLog';

const walk = { id: 'w1', walk_id: 'castle_an_dinas', walk_name: 'Castle an Dinas', difficulty: { key: 'TRAIL RANGER' } };
const TODAY = '2026-09-29';

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
};

describe('a new log', () => {
  it('starts today with the walk’s own difficulty and nothing else to fill in', () => {
    expect(emptyForm(walk, TODAY)).toEqual({
      date: TODAY,
      timesOn: false,
      startTime: '',
      endTime: '',
      difficulty: 'TRAIL RANGER',
      description: '',
      companions: [],
    });
  });

  it('leaves difficulty for the server when the walk has none', () => {
    expect(emptyForm({ id: 'x' }, TODAY).difficulty).toBe('');
  });

  it('offers the same five levels the walks are rated on', () => {
    expect(FEEL_CHOICES.map((c) => c.key)).toEqual([
      'NOVICE WANDERER',
      "GREY'S PATHFINDER",
      'TRAIL RANGER',
      "WARDEN'S ASCENT",
      'MASTER WAYFARER',
    ]);
  });

  it('uses the local date, not UTC', () => {
    // 00:30 on the 29th in a UTC+1 zone is still the 28th in UTC.
    expect(localDate(new Date(2026, 8, 29, 0, 30))).toBe('2026-09-29');
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('validate', () => {
  const form = (over = {}) => ({ ...emptyForm(walk, TODAY), ...over });

  it('accepts a blank new log: the walk and the day are enough', () => {
    expect(validate(form(), TODAY)).toEqual({});
  });

  it('needs a day, and not one in the future', () => {
    expect(validate(form({ date: '' }), TODAY).date).toMatch(/day you walked/);
    expect(validate(form({ date: '2026-10-01' }), TODAY).date).toMatch(/hasn't happened/);
    expect(validate(form({ date: TODAY }), TODAY).date).toBeUndefined();
  });

  it('only checks the times when they are switched on and both given', () => {
    const bad = { timesOn: true, startTime: '10:00', endTime: '09:00' };
    expect(validate(form(bad), TODAY).endTime).toMatch(/after the start/);
    expect(validate(form({ ...bad, timesOn: false }), TODAY).endTime).toBeUndefined();
    expect(validate(form({ timesOn: true, startTime: '10:00' }), TODAY).endTime).toBeUndefined();
  });

  it('caps the notes', () => {
    expect(validate(form({ description: 'x'.repeat(NOTES_MAX + 1) }), TODAY).description).toBeDefined();
    expect(validate(form({ description: 'x'.repeat(NOTES_MAX) }), TODAY).description).toBeUndefined();
  });
});

describe('payloads', () => {
  it('sends only what the server can’t default, with times left out unless added', () => {
    const payload = buildLogPayload(walk, { ...emptyForm(walk, TODAY), description: '  Windy  ', companions: ['c1'] });
    expect(payload).toEqual({
      walk_id: 'w1',
      start_date: TODAY,
      description: 'Windy',
      companion_ids: ['c1'],
      start_time: null,
      end_time: null,
      difficulty_level: 'TRAIL RANGER',
    });
    expect(payload).not.toHaveProperty('title');
    expect(payload).not.toHaveProperty('categories');
  });

  it('includes the times once they are switched on', () => {
    const form = { ...emptyForm(walk, TODAY), timesOn: true, startTime: '09:30', endTime: '12:15' };
    expect(buildLogPayload(walk, form)).toMatchObject({ start_time: '09:30', end_time: '12:15' });
    expect(buildLogPayload(walk, { ...form, timesOn: false })).toMatchObject({ start_time: null, end_time: null });
  });

  it('omits difficulty rather than sending an empty one', () => {
    expect(buildLogPayload({ id: 'x' }, emptyForm({ id: 'x' }, TODAY))).not.toHaveProperty('difficulty_level');
  });

  it('clears times on edit when they are switched off', () => {
    const payload = buildUpdatePayload({ ...emptyForm(walk, TODAY), timesOn: false, startTime: '09:00' });
    expect(payload).toMatchObject({ start_time: null, end_time: null });
    expect(payload).not.toHaveProperty('walk_id');
  });
});

describe('editing an existing log', () => {
  const entry = {
    start_date: '2026-09-12',
    end_date: '2026-09-12',
    start_time: '09:30:00',
    end_time: null,
    difficulty_level: "WARDEN'S ASCENT",
    description: 'Lovely',
    companions: [{ id: 'c1', name: 'Sam' }],
  };

  it('fills the form from the log', () => {
    expect(formFromEntry(entry)).toEqual({
      date: '2026-09-12',
      timesOn: true,
      startTime: '09:30',
      endTime: '',
      difficulty: "WARDEN'S ASCENT",
      description: 'Lovely',
      companions: ['c1'],
    });
  });
});

describe('drafts', () => {
  it('round-trips per walk and clears', () => {
    const storage = memoryStorage();
    const form = { ...emptyForm(walk, TODAY), description: 'half typed' };
    saveDraft(storage, 'w1', form);
    expect(loadDraft(storage, 'w1')).toEqual(form);
    expect(loadDraft(storage, 'w2')).toBeNull();
    clearDraft(storage, 'w1');
    expect(loadDraft(storage, 'w1')).toBeNull();
  });

  it('survives storage that throws or holds junk', () => {
    const broken = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('full'); },
      removeItem: () => { throw new Error('denied'); },
    };
    expect(() => saveDraft(broken, 'w1', {})).not.toThrow();
    expect(loadDraft(broken, 'w1')).toBeNull();
    expect(() => clearDraft(broken, 'w1')).not.toThrow();
    const junk = memoryStorage();
    junk.setItem('walkquest:log-draft:w1', '{not json');
    expect(loadDraft(junk, 'w1')).toBeNull();
  });

  it('treats an untouched form as not worth keeping', () => {
    expect(isPristine(emptyForm(walk, TODAY), walk, TODAY)).toBe(true);
    expect(isPristine({ ...emptyForm(walk, TODAY), description: 'x' }, walk, TODAY)).toBe(false);
  });
});

describe('display', () => {
  it('formats a day without timezone drift', () => {
    expect(formatDay('2026-09-12')).toBe('Sat 12 Sep 2026');
    expect(formatDay('2026-09-12', { withYear: false })).toBe('Sat 12 Sep');
    expect(formatDay('')).toBe('');
  });

  it('describes when a log happened', () => {
    expect(dayRange({ start_date: '2026-09-12', end_date: '2026-09-12' })).toBe('Sat 12 Sep 2026');
    expect(dayRange({ start_date: '2026-09-11', end_date: '2026-09-12' })).toBe('Fri 11 Sep – Sat 12 Sep 2026');
    expect(timeRange({ start_time: '09:30:00', end_time: '12:15:00' })).toBe('09:30–12:15');
    expect(timeRange({ start_time: '09:30:00' })).toBe('from 09:30');
    expect(timeRange({ end_time: '12:15:00' })).toBe('until 12:15');
    expect(timeRange({})).toBe('');
  });

  it('finds the latest log of a walk in a newest-first list', () => {
    const list = [
      { id: 'a', walk: { id: 'w2' } },
      { id: 'b', walk: { id: 'w1' } },
      { id: 'c', walk: { id: 'w1' } },
      { id: 'd', walk: null },
    ];
    expect(latestLogFor(list, 'w1').id).toBe('b');
    expect(latestLogFor(list, 'nope')).toBeNull();
  });
});

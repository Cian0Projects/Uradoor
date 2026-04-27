import { describe, expect, it } from 'vitest';
import { buildSchedule, totalKnownDurationSec } from './buildSchedule';
import type { Workout } from '../types';

const base: Workout = {
  id: 't',
  name: 'test',
  sets: 1,
  repsPerSet: 1,
  work: { kind: 'timed', seconds: 30 },
  restBetweenRepsSec: 0,
  restBetweenSetsSec: 0,
};

describe('buildSchedule', () => {
  it('1 set × 1 rep produces a single work phase', () => {
    const phases = buildSchedule(base);
    expect(phases).toHaveLength(1);
    expect(phases[0].kind).toBe('work');
    expect(phases[0].durationSec).toBe(30);
  });

  it('1 set × N reps interleaves work + restRep but not after the last rep', () => {
    const phases = buildSchedule({
      ...base,
      repsPerSet: 3,
      restBetweenRepsSec: 15,
    });
    // work, rest, work, rest, work
    expect(phases.map((p) => p.kind)).toEqual([
      'work',
      'restRep',
      'work',
      'restRep',
      'work',
    ]);
  });

  it('skips zero-duration rests', () => {
    const phases = buildSchedule({
      ...base,
      repsPerSet: 3,
      restBetweenRepsSec: 0,
    });
    expect(phases.map((p) => p.kind)).toEqual(['work', 'work', 'work']);
  });

  it('runs the full rep rest before the set break, but no rest after the final rep of the final set', () => {
    const phases = buildSchedule({
      ...base,
      sets: 2,
      repsPerSet: 2,
      restBetweenRepsSec: 10,
      restBetweenSetsSec: 60,
    });
    expect(phases.map((p) => p.kind)).toEqual([
      // set 1
      'work',
      'restRep',
      'work',
      'restRep', // recover from the final rep of set 1 first
      'restSet', // then the long set break
      // set 2
      'work',
      'restRep',
      'work', // last rep of last set — nothing after
    ]);
  });

  it('omits the rep rest before a set break when restBetweenRepsSec is 0', () => {
    const phases = buildSchedule({
      ...base,
      sets: 2,
      repsPerSet: 2,
      restBetweenRepsSec: 0,
      restBetweenSetsSec: 60,
    });
    expect(phases.map((p) => p.kind)).toEqual([
      'work',
      'work',
      'restSet',
      'work',
      'work',
    ]);
  });

  it('omits the set break when restBetweenSetsSec is 0 but keeps the rep rest', () => {
    const phases = buildSchedule({
      ...base,
      sets: 2,
      repsPerSet: 2,
      restBetweenRepsSec: 10,
      restBetweenSetsSec: 0,
    });
    expect(phases.map((p) => p.kind)).toEqual([
      'work',
      'restRep',
      'work',
      'restRep',
      'work',
      'restRep',
      'work',
    ]);
  });

  it('includes warmup and cooldown when set', () => {
    const phases = buildSchedule({
      ...base,
      warmupSec: 60,
      cooldownSec: 120,
    });
    expect(phases[0].kind).toBe('warmup');
    expect(phases[0].durationSec).toBe(60);
    expect(phases[phases.length - 1].kind).toBe('cooldown');
    expect(phases[phases.length - 1].durationSec).toBe(120);
  });

  it('manual work mode produces null durationSec on work phases', () => {
    const phases = buildSchedule({
      ...base,
      repsPerSet: 2,
      restBetweenRepsSec: 30,
      work: { kind: 'manual' },
    });
    const workPhases = phases.filter((p) => p.kind === 'work');
    expect(workPhases.every((p) => p.durationSec === null)).toBe(true);
    const restPhases = phases.filter((p) => p.kind === 'restRep');
    expect(restPhases.every((p) => p.durationSec === 30)).toBe(true);
  });

  it('labels include set + rep info when sets > 1', () => {
    const phases = buildSchedule({
      ...base,
      sets: 2,
      repsPerSet: 2,
    });
    const work = phases.filter((p) => p.kind === 'work');
    expect(work[0].label).toBe('Set 1 · Rep 1/2');
    expect(work[3].label).toBe('Set 2 · Rep 2/2');
  });

  it('totalKnownDurationSec ignores manual work phases', () => {
    const phases = buildSchedule({
      ...base,
      repsPerSet: 3,
      restBetweenRepsSec: 30,
      work: { kind: 'manual' },
    });
    // Only the two restRep phases (30s each) count.
    expect(totalKnownDurationSec(phases)).toBe(60);
  });
});

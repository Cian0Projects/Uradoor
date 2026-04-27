import type { Phase, Workout } from '../types';

export function buildSchedule(w: Workout): Phase[] {
  const phases: Phase[] = [];

  if (w.warmupSec && w.warmupSec > 0) {
    phases.push({
      kind: 'warmup',
      durationSec: w.warmupSec,
      label: 'Warmup',
    });
  }

  for (let s = 1; s <= w.sets; s++) {
    for (let r = 1; r <= w.repsPerSet; r++) {
      const workLabel =
        w.sets > 1
          ? `Set ${s} · Rep ${r}/${w.repsPerSet}`
          : `Rep ${r}/${w.repsPerSet}`;

      phases.push({
        kind: 'work',
        setIndex: s,
        repIndex: r,
        durationSec: w.work.kind === 'timed' ? w.work.seconds : null,
        label: workLabel,
      });

      const isLastRepOfSet = r === w.repsPerSet;
      const isLastSet = s === w.sets;

      // Always run the full rep rest after every rep (except the very last
      // rep of the very last set). When this rep is the last of a set and
      // another set is coming, the rep rest is followed by the set break.
      if (!isLastRepOfSet || !isLastSet) {
        if (w.restBetweenRepsSec > 0) {
          phases.push({
            kind: 'restRep',
            setIndex: s,
            repIndex: r,
            durationSec: w.restBetweenRepsSec,
            label: 'Rest',
          });
        }
      }

      if (isLastRepOfSet && !isLastSet && w.restBetweenSetsSec > 0) {
        phases.push({
          kind: 'restSet',
          setIndex: s,
          durationSec: w.restBetweenSetsSec,
          label: `Set break (next: Set ${s + 1})`,
        });
      }
    }
  }

  if (w.cooldownSec && w.cooldownSec > 0) {
    phases.push({
      kind: 'cooldown',
      durationSec: w.cooldownSec,
      label: 'Cooldown',
    });
  }

  return phases;
}

export function totalKnownDurationSec(phases: Phase[]): number {
  return phases.reduce((acc, p) => acc + (p.durationSec ?? 0), 0);
}

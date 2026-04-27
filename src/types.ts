export type WorkMode =
  | { kind: 'timed'; seconds: number }
  | { kind: 'manual' };

export type Workout = {
  id: string;
  name: string;
  warmupSec?: number;
  cooldownSec?: number;
  sets: number;
  repsPerSet: number;
  work: WorkMode;
  restBetweenRepsSec: number;
  restBetweenSetsSec: number;
};

export type PhaseKind = 'warmup' | 'work' | 'restRep' | 'restSet' | 'cooldown';

export type Phase = {
  kind: PhaseKind;
  setIndex?: number;
  repIndex?: number;
  durationSec: number | null;
  label: string;
};

import { useState } from 'react';
import { newId, saveWorkout } from '../storage';
import type { Workout } from '../types';

type Props = {
  initial?: Workout;
  onCancel: () => void;
  onSaved: (w: Workout) => void;
};

type FormState = {
  name: string;
  sets: number;
  repsPerSet: number;
  workMode: 'timed' | 'manual';
  workSeconds: number;
  restBetweenRepsSec: number;
  restBetweenSetsSec: number;
  warmupSec: number;
  cooldownSec: number;
};

function fromWorkout(w?: Workout): FormState {
  if (!w) {
    return {
      name: 'My workout',
      sets: 1,
      repsPerSet: 5,
      workMode: 'manual',
      workSeconds: 60,
      restBetweenRepsSec: 90,
      restBetweenSetsSec: 180,
      warmupSec: 0,
      cooldownSec: 0,
    };
  }
  return {
    name: w.name,
    sets: w.sets,
    repsPerSet: w.repsPerSet,
    workMode: w.work.kind,
    workSeconds: w.work.kind === 'timed' ? w.work.seconds : 60,
    restBetweenRepsSec: w.restBetweenRepsSec,
    restBetweenSetsSec: w.restBetweenSetsSec,
    warmupSec: w.warmupSec ?? 0,
    cooldownSec: w.cooldownSec ?? 0,
  };
}

function toWorkout(f: FormState, id: string): Workout {
  return {
    id,
    name: f.name.trim() || 'Untitled',
    sets: Math.max(1, f.sets | 0),
    repsPerSet: Math.max(1, f.repsPerSet | 0),
    work:
      f.workMode === 'timed'
        ? { kind: 'timed', seconds: Math.max(1, f.workSeconds | 0) }
        : { kind: 'manual' },
    restBetweenRepsSec: Math.max(0, f.restBetweenRepsSec | 0),
    restBetweenSetsSec: Math.max(0, f.restBetweenSetsSec | 0),
    warmupSec: f.warmupSec > 0 ? f.warmupSec | 0 : undefined,
    cooldownSec: f.cooldownSec > 0 ? f.cooldownSec | 0 : undefined,
  };
}

export default function Builder({ initial, onCancel, onSaved }: Props) {
  const [f, setF] = useState<FormState>(() => fromWorkout(initial));

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const handleSave = () => {
    const id = initial?.id ?? newId();
    const w = toWorkout(f, id);
    saveWorkout(w);
    onSaved(w);
  };

  return (
    <div className="screen screen--builder">
      <header className="topbar">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          ← Back
        </button>
        <h1>{initial ? 'Edit workout' : 'New workout'}</h1>
      </header>

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={f.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Sets</span>
            <input
              type="number"
              min={1}
              value={f.sets}
              onChange={(e) => update('sets', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Reps per set</span>
            <input
              type="number"
              min={1}
              value={f.repsPerSet}
              onChange={(e) => update('repsPerSet', Number(e.target.value))}
            />
          </label>
        </div>

        <fieldset className="field">
          <legend>Work mode</legend>
          <label className="radio">
            <input
              type="radio"
              checked={f.workMode === 'manual'}
              onChange={() => update('workMode', 'manual')}
            />
            Manual (tap to finish — for distance reps)
          </label>
          <label className="radio">
            <input
              type="radio"
              checked={f.workMode === 'timed'}
              onChange={() => update('workMode', 'timed')}
            />
            Timed
          </label>
          {f.workMode === 'timed' && (
            <label className="field field--inline">
              <span>Work seconds</span>
              <input
                type="number"
                min={1}
                value={f.workSeconds}
                onChange={(e) => update('workSeconds', Number(e.target.value))}
              />
            </label>
          )}
        </fieldset>

        <label className="field">
          <span>Rest between reps (seconds)</span>
          <input
            type="number"
            min={0}
            value={f.restBetweenRepsSec}
            onChange={(e) => update('restBetweenRepsSec', Number(e.target.value))}
          />
        </label>

        {f.sets > 1 && (
          <label className="field">
            <span>Rest between sets (seconds)</span>
            <input
              type="number"
              min={0}
              value={f.restBetweenSetsSec}
              onChange={(e) => update('restBetweenSetsSec', Number(e.target.value))}
            />
          </label>
        )}

        <div className="field-row">
          <label className="field">
            <span>Warmup (seconds, 0 = none)</span>
            <input
              type="number"
              min={0}
              value={f.warmupSec}
              onChange={(e) => update('warmupSec', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Cooldown (seconds, 0 = none)</span>
            <input
              type="number"
              min={0}
              value={f.cooldownSec}
              onChange={(e) => update('cooldownSec', Number(e.target.value))}
            />
          </label>
        </div>

        <div className="form__actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

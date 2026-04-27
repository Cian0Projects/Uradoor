import { useEffect, useState } from 'react';
import { downloadFit } from '../garmin/fitWorkout';
import { PRESETS } from '../presets';
import { deleteWorkout, loadWorkouts } from '../storage';
import type { Workout } from '../types';

type Props = {
  onRun: (w: Workout) => void;
  onBuild: () => void;
  onEdit: (w: Workout) => void;
};

function summarize(w: Workout): string {
  const work =
    w.work.kind === 'timed' ? `${w.work.seconds}s work` : 'manual-finish work';
  const restRep = w.restBetweenRepsSec ? `${w.restBetweenRepsSec}s rest` : 'no rep rest';
  const setBreak =
    w.sets > 1 ? ` · ${w.restBetweenSetsSec}s set break` : '';
  return `${w.sets > 1 ? `${w.sets} × ` : ''}${w.repsPerSet} reps · ${work} · ${restRep}${setBreak}`;
}

export default function Home({ onRun, onBuild, onEdit }: Props) {
  const [custom, setCustom] = useState<Workout[]>([]);

  useEffect(() => {
    setCustom(loadWorkouts());
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm('Delete this workout?')) return;
    setCustom(deleteWorkout(id));
  };

  return (
    <div className="screen screen--home">
      <header className="topbar">
        <h1>Uradoor</h1>
        <p className="tagline">Interval timer for run training.</p>
      </header>

      <section>
        <h2>Presets</h2>
        <ul className="workout-list">
          {PRESETS.map((w) => (
            <li key={w.id} className="workout-card">
              <div className="workout-card__main">
                <div className="workout-card__name">{w.name}</div>
                <div className="workout-card__detail">{summarize(w)}</div>
              </div>
              <div className="workout-card__actions">
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => downloadFit(w)}
                  title="Download a Garmin .FIT file you can import into Garmin Connect"
                >
                  Export to Garmin
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => onRun(w)}
                >
                  Start
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="row-between">
          <h2>Your workouts</h2>
          <button type="button" className="btn" onClick={onBuild}>
            + Build new
          </button>
        </div>
        {custom.length === 0 ? (
          <p className="muted">No saved workouts yet. Tap "Build new" to make one.</p>
        ) : (
          <ul className="workout-list">
            {custom.map((w) => (
              <li key={w.id} className="workout-card">
                <div className="workout-card__main">
                  <div className="workout-card__name">{w.name}</div>
                  <div className="workout-card__detail">{summarize(w)}</div>
                </div>
                <div className="workout-card__actions">
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => onEdit(w)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--danger"
                    onClick={() => handleDelete(w.id)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => downloadFit(w)}
                    title="Download a Garmin .FIT file you can import into Garmin Connect"
                  >
                    Export to Garmin
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onRun(w)}
                  >
                    Start
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

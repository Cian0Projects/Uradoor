import { useEffect, useMemo, useRef } from 'react';
import { armAudio, cues } from '../audio/cues';
import { disableWakeLock, enableWakeLock } from '../audio/wakeLock';
import BigClock from '../ui/BigClock';
import PhaseBadge from '../ui/PhaseBadge';
import { useTimer } from '../timer/useTimer';
import type { Phase, PhaseKind, Workout } from '../types';

type Props = {
  workout: Workout;
  onExit: () => void;
};

function phaseCueKind(kind: PhaseKind): 'work' | 'rest' | 'setBreak' | 'cooldown' | 'warmup' {
  if (kind === 'work') return 'work';
  if (kind === 'restRep') return 'rest';
  if (kind === 'restSet') return 'setBreak';
  if (kind === 'cooldown') return 'cooldown';
  return 'warmup';
}

function formatTotal(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function announce(p: Phase | null): string {
  if (!p) return '';
  return `${p.label}`;
}

export default function Run({ workout, onExit }: Props) {
  const announceRef = useRef<HTMLDivElement>(null);

  const timer = useTimer(workout, useMemo(() => ({
    onCountdownTick: () => cues.countdown(),
    onPhaseStart: (p) => {
      cues.phaseChange(phaseCueKind(p.kind));
      if (announceRef.current) announceRef.current.textContent = announce(p);
    },
    onSessionEnd: () => {
      cues.done();
      if (announceRef.current) announceRef.current.textContent = 'Session complete';
    },
  }), []));

  // Wake lock + cleanup.
  useEffect(() => {
    if (timer.running) void enableWakeLock();
    else void disableWakeLock();
  }, [timer.running]);

  useEffect(() => {
    return () => {
      void disableWakeLock();
    };
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        timer.toggle();
      } else if (e.key === 'n') {
        timer.skip();
      } else if (e.key === 'p') {
        timer.previous();
      } else if (e.key === 'f') {
        timer.finishManualRep();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timer]);

  const handleStart = () => {
    armAudio();
    timer.start();
  };

  const isManualWork =
    timer.current?.kind === 'work' && timer.current.durationSec == null;

  const phaseClass = timer.current ? `run--${timer.current.kind}` : 'run--idle';

  return (
    <div className={`screen screen--run ${phaseClass}`}>
      <header className="topbar topbar--run">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            timer.stop();
            onExit();
          }}
        >
          ← Exit
        </button>
        <div className="run-meta">
          <strong>{workout.name}</strong>
          <span className="muted">Total: {formatTotal(timer.totalElapsedMs)}</span>
        </div>
      </header>

      {!timer.started && (
        <div className="run-pre">
          <p>Tap start when you're ready. Audio + vibration will cue each phase.</p>
          <button type="button" className="btn btn--primary btn--xl" onClick={handleStart}>
            Start
          </button>
        </div>
      )}

      {timer.started && !timer.done && timer.current && (
        <>
          <div className="run-phase">
            <PhaseBadge kind={timer.current.kind} />
            <h2 className="run-phase__label">{timer.current.label}</h2>
          </div>

          <BigClock
            ms={isManualWork ? timer.elapsedMs : timer.remainingMs ?? 0}
            countingUp={isManualWork}
          />

          {timer.next && (
            <p className="run-next muted">
              Next: <PhaseBadge kind={timer.next.kind} /> {timer.next.label}
              {timer.next.durationSec != null ? ` · ${timer.next.durationSec}s` : ''}
            </p>
          )}

          <div className="run-controls">
            {isManualWork ? (
              <button
                type="button"
                className="btn btn--primary btn--xl"
                onClick={() => timer.finishManualRep()}
              >
                Finish rep
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--xl"
                onClick={() => timer.toggle()}
              >
                {timer.paused ? 'Resume' : 'Pause'}
              </button>
            )}
            <div className="run-controls__row">
              <button type="button" className="btn" onClick={() => timer.previous()}>
                ← Back
              </button>
              <button type="button" className="btn" onClick={() => timer.skip()}>
                Skip →
              </button>
            </div>
          </div>
        </>
      )}

      {timer.done && (
        <div className="run-done">
          <h2>Session complete</h2>
          <p className="muted">Total time: {formatTotal(timer.totalElapsedMs)}</p>
          <button type="button" className="btn btn--primary btn--xl" onClick={onExit}>
            Done
          </button>
        </div>
      )}

      <div ref={announceRef} aria-live="assertive" className="sr-only" />
    </div>
  );
}

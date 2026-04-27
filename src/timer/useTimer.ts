import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Phase, Workout } from '../types';
import { buildSchedule } from './buildSchedule';

export type Cues = {
  onCountdownTick?: (remainingSec: 1 | 2 | 3) => void;
  onPhaseEnd?: (endingPhase: Phase, nextPhase: Phase | null) => void;
  onPhaseStart?: (phase: Phase, isFirst: boolean) => void;
  onSessionEnd?: () => void;
};

export type TimerView = {
  phases: Phase[];
  index: number;
  current: Phase | null;
  next: Phase | null;
  running: boolean;
  paused: boolean;
  started: boolean;
  done: boolean;
  remainingMs: number | null;
  elapsedMs: number;
  totalElapsedMs: number;
};

export type TimerControls = {
  start: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  skip: () => void;
  previous: () => void;
  finishManualRep: () => void;
  stop: () => void;
};

export function useTimer(
  workout: Workout | null,
  cues?: Cues,
): TimerView & TimerControls {
  const phases = useMemo(() => (workout ? buildSchedule(workout) : []), [workout]);

  const [index, setIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [, forceTick] = useState(0);

  const phaseStartedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const sessionPausedAccRef = useRef(0);
  const lastCountdownTickRef = useRef<number | null>(null);

  const cuesRef = useRef(cues);
  cuesRef.current = cues;

  const indexRef = useRef(index);
  indexRef.current = index;

  const reset = useCallback(() => {
    setIndex(-1);
    setRunning(false);
    setPaused(false);
    phaseStartedAtRef.current = null;
    pausedAtRef.current = null;
    sessionStartedAtRef.current = null;
    sessionPausedAccRef.current = 0;
    lastCountdownTickRef.current = null;
  }, []);

  // Reset when the workout changes.
  useEffect(() => {
    reset();
  }, [workout, reset]);

  const enterPhase = useCallback(
    (newIdx: number, isFirst: boolean) => {
      lastCountdownTickRef.current = null;
      phaseStartedAtRef.current = Date.now();
      pausedAtRef.current = null;
      // Keep indexRef in sync immediately so the rAF tick (which may fire
      // before React re-renders) reads the new phase, not the old one.
      indexRef.current = newIdx;
      setIndex(newIdx);
      const p = phases[newIdx];
      if (p) cuesRef.current?.onPhaseStart?.(p, isFirst);
    },
    [phases],
  );

  const advance = useCallback(() => {
    const cur = indexRef.current;
    const ending = phases[cur] ?? null;
    const nextIdx = cur + 1;
    const next = phases[nextIdx] ?? null;
    if (ending) cuesRef.current?.onPhaseEnd?.(ending, next);
    if (nextIdx >= phases.length) {
      phaseStartedAtRef.current = null;
      indexRef.current = phases.length;
      setRunning(false);
      setIndex(phases.length);
      cuesRef.current?.onSessionEnd?.();
      return;
    }
    enterPhase(nextIdx, false);
  }, [phases, enterPhase]);

  // rAF tick loop.
  useEffect(() => {
    if (!running || paused) return;
    let raf = 0;
    const tick = () => {
      forceTick((n) => (n + 1) & 0xffff);
      const cur = phases[indexRef.current];
      if (cur && cur.durationSec != null && phaseStartedAtRef.current != null) {
        const elapsed = Date.now() - phaseStartedAtRef.current;
        const remaining = cur.durationSec * 1000 - elapsed;
        const remSec = Math.ceil(remaining / 1000);
        if (remSec >= 1 && remSec <= 3 && lastCountdownTickRef.current !== remSec) {
          lastCountdownTickRef.current = remSec;
          cuesRef.current?.onCountdownTick?.(remSec as 1 | 2 | 3);
        }
        if (remaining <= 0) {
          // advance() updates indexRef + phaseStartedAtRef synchronously, so
          // we can fall through and keep the rAF loop alive across the
          // transition. (If advance ends the session, setRunning(false) will
          // tear down this effect and the cleanup will cancel the next rAF.)
          advance();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, paused, phases, advance]);

  const start = useCallback(() => {
    if (phases.length === 0) return;
    sessionStartedAtRef.current = Date.now();
    sessionPausedAccRef.current = 0;
    setRunning(true);
    setPaused(false);
    enterPhase(0, true);
  }, [phases, enterPhase]);

  const pause = useCallback(() => {
    if (!running || paused) return;
    pausedAtRef.current = Date.now();
    setPaused(true);
  }, [running, paused]);

  const resume = useCallback(() => {
    if (!running || !paused) return;
    if (pausedAtRef.current != null && phaseStartedAtRef.current != null) {
      const pausedFor = Date.now() - pausedAtRef.current;
      phaseStartedAtRef.current += pausedFor;
      sessionPausedAccRef.current += pausedFor;
    }
    pausedAtRef.current = null;
    setPaused(false);
  }, [running, paused]);

  const toggle = useCallback(() => {
    if (!running) start();
    else if (paused) resume();
    else pause();
  }, [running, paused, start, pause, resume]);

  const skip = useCallback(() => {
    if (!running) return;
    advance();
  }, [running, advance]);

  const previous = useCallback(() => {
    if (!running) return;
    const cur = indexRef.current;
    const target = Math.max(0, cur - 1);
    enterPhase(target, target === 0);
  }, [running, enterPhase]);

  const finishManualRep = useCallback(() => {
    if (!running) return;
    const cur = phases[indexRef.current];
    if (cur && cur.kind === 'work' && cur.durationSec == null) advance();
  }, [running, phases, advance]);

  const stop = useCallback(() => {
    reset();
  }, [reset]);

  // Compute view.
  const current = phases[index] ?? null;
  const next = phases[index + 1] ?? null;
  const done = running === false && index >= phases.length && phases.length > 0;
  const started = index >= 0;

  let remainingMs: number | null = null;
  let elapsedMs = 0;
  if (current && phaseStartedAtRef.current != null) {
    const refTime = paused && pausedAtRef.current != null ? pausedAtRef.current : Date.now();
    elapsedMs = Math.max(0, refTime - phaseStartedAtRef.current);
    if (current.durationSec != null) {
      remainingMs = Math.max(0, current.durationSec * 1000 - elapsedMs);
    }
  }

  let totalElapsedMs = 0;
  if (sessionStartedAtRef.current != null) {
    const refTime = paused && pausedAtRef.current != null ? pausedAtRef.current : Date.now();
    totalElapsedMs = Math.max(0, refTime - sessionStartedAtRef.current - sessionPausedAccRef.current);
  }

  return {
    phases,
    index,
    current,
    next,
    running,
    paused,
    started,
    done,
    remainingMs,
    elapsedMs,
    totalElapsedMs,
    start,
    pause,
    resume,
    toggle,
    skip,
    previous,
    finishManualRep,
    stop,
  };
}

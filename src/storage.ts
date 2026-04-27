import type { Workout } from './types';

const KEY = 'uradoor.workouts';
const SCHEMA_KEY = 'uradoor.schema';
const SCHEMA_VERSION = 1;

export function loadWorkouts(): Workout[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Workout[]) : [];
  } catch {
    return [];
  }
}

export function saveWorkout(w: Workout): Workout[] {
  const all = loadWorkouts();
  const idx = all.findIndex((x) => x.id === w.id);
  if (idx >= 0) all[idx] = w;
  else all.push(w);
  localStorage.setItem(KEY, JSON.stringify(all));
  localStorage.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  return all;
}

export function deleteWorkout(id: string): Workout[] {
  const all = loadWorkouts().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function newId(): string {
  return 'w-' + Math.random().toString(36).slice(2, 10);
}

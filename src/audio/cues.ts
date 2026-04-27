// WebAudio-based cues + navigator.vibrate. Lazy AudioContext init so iOS Safari
// is happy (it requires a user gesture before the first sound).

let ctx: AudioContext | null = null;
let armed = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function armAudio(): void {
  // Call from a user-gesture handler before the first programmatic beep.
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  armed = true;
}

function beep(freq: number, durationMs: number, gain = 0.25): void {
  const c = getCtx();
  if (!c || !armed) return;
  const t0 = c.currentTime;
  const t1 = t0 + durationMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Short attack/release envelope to avoid clicks.
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.linearRampToValueAtTime(gain, t1 - 0.02);
  g.gain.linearRampToValueAtTime(0, t1);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

export const cues = {
  countdown(): void {
    beep(880, 120);
  },
  go(): void {
    beep(660, 350, 0.3);
    vibrate([220, 80, 220]);
  },
  phaseChange(kind: 'work' | 'rest' | 'setBreak' | 'cooldown' | 'warmup'): void {
    if (kind === 'work') {
      beep(660, 350, 0.3);
      vibrate([220, 80, 220]);
    } else if (kind === 'rest') {
      beep(440, 200);
      vibrate(180);
    } else if (kind === 'setBreak') {
      beep(330, 250);
      setTimeout(() => beep(330, 250), 200);
      vibrate([200, 100, 200, 100, 200]);
    } else {
      beep(520, 200);
      vibrate(150);
    }
  },
  done(): void {
    beep(880, 200, 0.3);
    setTimeout(() => beep(660, 200, 0.3), 220);
    setTimeout(() => beep(440, 400, 0.3), 440);
    vibrate([300, 100, 300, 100, 300]);
  },
};

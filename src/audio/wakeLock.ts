type Sentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockNav = {
  wakeLock?: { request: (type: 'screen') => Promise<Sentinel> };
};

let sentinel: Sentinel | null = null;
let active = false;

async function acquire(): Promise<void> {
  const nav = navigator as Navigator & WakeLockNav;
  if (!nav.wakeLock) return;
  try {
    sentinel = await nav.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    /* user denied or unsupported — silently degrade */
  }
}

function onVisibilityChange(): void {
  if (active && document.visibilityState === 'visible' && !sentinel) {
    void acquire();
  }
}

export async function enableWakeLock(): Promise<void> {
  if (active) return;
  active = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  await acquire();
}

export async function disableWakeLock(): Promise<void> {
  active = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (sentinel && !sentinel.released) {
    try {
      await sentinel.release();
    } catch {
      /* ignore */
    }
  }
  sentinel = null;
}

import { useState } from 'react';
import Builder from './screens/Builder';
import Home from './screens/Home';
import Run from './screens/Run';
import type { Workout } from './types';

type Screen =
  | { kind: 'home' }
  | { kind: 'builder'; editing?: Workout }
  | { kind: 'run'; workout: Workout };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });

  if (screen.kind === 'home') {
    return (
      <Home
        onRun={(w) => setScreen({ kind: 'run', workout: w })}
        onBuild={() => setScreen({ kind: 'builder' })}
        onEdit={(w) => setScreen({ kind: 'builder', editing: w })}
      />
    );
  }

  if (screen.kind === 'builder') {
    return (
      <Builder
        initial={screen.editing}
        onCancel={() => setScreen({ kind: 'home' })}
        onSaved={() => setScreen({ kind: 'home' })}
      />
    );
  }

  return <Run workout={screen.workout} onExit={() => setScreen({ kind: 'home' })} />;
}

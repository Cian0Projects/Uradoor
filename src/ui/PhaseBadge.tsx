import type { PhaseKind } from '../types';

const LABELS: Record<PhaseKind, string> = {
  warmup: 'Warmup',
  work: 'Work',
  restRep: 'Rest',
  restSet: 'Set break',
  cooldown: 'Cooldown',
};

export default function PhaseBadge({ kind }: { kind: PhaseKind }) {
  return <span className={`badge badge--${kind}`}>{LABELS[kind]}</span>;
}

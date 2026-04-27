type Props = {
  ms: number;
  countingUp?: boolean;
};

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function BigClock({ ms, countingUp }: Props) {
  return (
    <div className="big-clock" aria-live="off">
      <div className="big-clock__time">{format(ms)}</div>
      {countingUp ? <div className="big-clock__hint">elapsed</div> : null}
    </div>
  );
}

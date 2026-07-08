'use client';

export default function Stepper({ value, onChange, min = 1, max = 50 }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="count">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}>
        ＋
      </button>
    </div>
  );
}

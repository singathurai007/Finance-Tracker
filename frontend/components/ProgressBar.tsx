type ProgressTone = "ok" | "warning" | "exceeded" | "neutral";

const TONE_BAR: Record<ProgressTone, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  exceeded: "bg-rose-500",
  neutral: "bg-blue-500",
};

interface ProgressBarProps {
  /** Percentage 0-100+. Values above 100 are clamped for display. */
  value: number;
  tone?: ProgressTone;
  label: string;
}

export default function ProgressBar({
  value,
  tone = "neutral",
  label,
}: ProgressBarProps) {
  const safe = Number.isFinite(value) ? value : 0;
  const clamped = Math.max(0, Math.min(100, safe));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${TONE_BAR[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

import { CARD_CLASS } from "@/lib/ui";

type Tone = "default" | "positive" | "negative" | "primary";

const TONE_CLASS: Record<Tone, string> = {
  default: "text-slate-900 dark:text-slate-100",
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  primary: "text-blue-600 dark:text-blue-400",
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
}

export default function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: StatCardProps) {
  return (
    <div className={`${CARD_CLASS} p-5`}>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${TONE_CLASS[tone]}`}>{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

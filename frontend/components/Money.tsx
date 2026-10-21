import { formatMoney } from "@/lib/format";

interface MoneyProps {
  value: number;
  className?: string;
  /** Show a leading + for positive amounts. */
  signed?: boolean;
}

export default function Money({ value, className, signed }: MoneyProps) {
  const sign = signed && value > 0 ? "+" : "";
  return (
    <span className={className}>
      {sign}
      {formatMoney(value)}
    </span>
  );
}

"use client";

import { MONTH_NAMES } from "@/lib/format";
import { FIELD_CLASS, LABEL_CLASS } from "@/lib/ui";

export interface Period {
  month: number; // 1-12
  year: number;
}

interface MonthYearPickerProps {
  period: Period;
  onChange: (period: Period) => void;
  idPrefix?: string;
  yearsBack?: number;
  yearsForward?: number;
}

export default function MonthYearPicker({
  period,
  onChange,
  idPrefix = "period",
  yearsBack = 5,
  yearsForward = 1,
}: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + yearsForward; y >= currentYear - yearsBack; y -= 1) {
    years.push(y);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-month`}>
          Month
        </label>
        <select
          id={`${idPrefix}-month`}
          className={FIELD_CLASS}
          value={period.month}
          onChange={(event) =>
            onChange({ ...period, month: Number(event.target.value) })
          }
        >
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-year`}>
          Year
        </label>
        <select
          id={`${idPrefix}-year`}
          className={FIELD_CLASS}
          value={period.year}
          onChange={(event) =>
            onChange({ ...period, year: Number(event.target.value) })
          }
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

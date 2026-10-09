export interface LongDivisionRow {
  value: string;
  // Index in `digits` of the row's last digit. Rows are right-aligned to it.
  endColumn: number;
  kind: "subtract" | "bringDown" | "remainder";
}

export interface LongDivisionLayout {
  digits: string[];
  // Same length as digits. null = blank, before the first quotient digit.
  quotient: (string | null)[];
  rows: LongDivisionRow[];
  quotientValue: number;
  remainder: number;
}

// Works out the written long-division steps, column by column.
export function layoutLongDivision(dividend: number, divisor: number): LongDivisionLayout {
  if (!Number.isInteger(dividend) || dividend < 0) {
    throw new RangeError("dividend must be a non-negative integer");
  }
  if (!Number.isInteger(divisor) || divisor <= 0) {
    throw new RangeError("divisor must be a positive integer");
  }

  const digits = String(dividend).split("");
  const last = digits.length - 1;
  const quotient: (string | null)[] = [];
  const rows: LongDivisionRow[] = [];

  let current = 0;
  let started = false;

  for (let i = 0; i <= last; i++) {
    current = current * 10 + Number(digits[i]);

    // Not enough yet to divide: leave the quotient blank and take the next digit.
    if (!started && current < divisor && i < last) {
      quotient.push(null);
      continue;
    }
    started = true;

    const q = Math.floor(current / divisor);
    quotient.push(String(q));
    rows.push({ value: String(q * divisor), endColumn: i, kind: "subtract" });
    current -= q * divisor;

    if (i < last) {
      const next = current * 10 + Number(digits[i + 1]);
      rows.push({ value: String(next), endColumn: i + 1, kind: "bringDown" });
    }
  }

  rows.push({ value: String(current), endColumn: last, kind: "remainder" });

  return {
    digits,
    quotient,
    rows,
    quotientValue: Math.floor(dividend / divisor),
    remainder: current,
  };
}

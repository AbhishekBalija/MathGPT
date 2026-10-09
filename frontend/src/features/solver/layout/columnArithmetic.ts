function assertWhole(n: number): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError("numbers must be non-negative integers");
  }
}

export interface ColumnAdditionLayout {
  width: number;
  // carries[i] is the carry written above column i (0 = leftmost). null = none.
  carries: (number | null)[];
  rows: string[];
  result: string;
}

export interface ColumnSubtractionLayout {
  width: number;
  // borrows[i] is true when column i lends 10 to the column on its right.
  borrows: boolean[];
  rows: string[];
  result: string;
}

export function layoutColumnAddition(operands: number[]): ColumnAdditionLayout {
  operands.forEach(assertWhole);
  const rows = operands.map(String);
  const sum = operands.reduce((total, n) => total + n, 0);
  const result = String(sum);
  const width = Math.max(result.length, ...rows.map((r) => r.length));

  const carries: (number | null)[] = new Array<number | null>(width).fill(null);
  let carry = 0;
  // Go right to left, like writing it by hand.
  for (let col = width - 1; col >= 0; col--) {
    let columnSum = carry;
    for (const row of rows) {
      const digit = row[row.length - (width - col)];
      columnSum += digit === undefined ? 0 : Number(digit);
    }
    carry = Math.floor(columnSum / 10);
    // The carry goes above the next column on the left.
    if (carry > 0 && col > 0) carries[col - 1] = carry;
  }

  return { width, carries, rows, result };
}

export function layoutColumnSubtraction(a: number, b: number): ColumnSubtractionLayout {
  assertWhole(a);
  assertWhole(b);
  if (a < b) throw new RangeError("a must be greater than or equal to b");

  const top = String(a);
  const bottom = String(b);
  const width = top.length;
  const borrows: boolean[] = new Array<boolean>(width).fill(false);

  let borrowed = 0;
  for (let col = width - 1; col >= 0; col--) {
    const bottomDigit = bottom[bottom.length - (width - col)];
    const diff = Number(top[col]) - borrowed - (bottomDigit === undefined ? 0 : Number(bottomDigit));
    if (diff < 0) {
      borrows[col - 1] = true;
      borrowed = 1;
    } else {
      borrowed = 0;
    }
  }

  return { width, borrows, rows: [top, bottom], result: String(a - b) };
}

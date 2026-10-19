/**
 * The choices Neo offers at Onboarding (#39) and how a saved answer reads.
 * The values match the API (backend/src/modules/users/class-info.ts).
 */

export type ClassRange = "class_1_5" | "class_6_8" | "class_9_10" | "class_11_12" | "college";
export type Board = "cbse" | "icse" | "state" | "ib" | "cambridge" | "other";

/** A student's saved answer, as the API sends it. */
export interface ClassInfo {
  range: ClassRange;
  helping: boolean;
  board: Board | null;
  state: string | null;
  institution: string | null;
}

/** What the class and board steps send to the API. */
export interface ClassAnswer {
  range: ClassRange;
  helping: boolean;
  board?: Board;
  state?: string;
  institution?: string;
}

// Each range shows a real problem from that stage, so a young child can
// find their row without reading the label
export const RANGES: { value: ClassRange; label: string; sub?: string; example: string }[] = [
  { value: "class_1_5", label: "Class 1–5", example: "156 ÷ 4" },
  { value: "class_6_8", label: "Class 6–8", example: "3x + 5 = 20" },
  { value: "class_9_10", label: "Class 9–10", example: "x² + 5x + 6 = 0" },
  { value: "class_11_12", label: "Class 11–12", sub: "PU · Diploma", example: "d/dx (sin x)" },
  { value: "college", label: "College & above", example: "∫ x eˣ dx" },
];

export const BOARDS: { value: Board; label: string }[] = [
  { value: "cbse", label: "CBSE" },
  { value: "icse", label: "ICSE / ISC" },
  { value: "state", label: "State board" },
  { value: "ib", label: "IB" },
  { value: "cambridge", label: "Cambridge" },
  { value: "other", label: "Other" },
];

// Karnataka first (most of our students), then every other state and union territory
export const INDIAN_STATES: string[] = [
  "Karnataka",
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/** Every range except college is a school range, which has a Board. */
export function isSchoolRange(range: ClassRange): boolean {
  return range !== "college";
}

function rangeLabel(range: ClassRange): string {
  return RANGES.find((option) => option.value === range)?.label ?? range;
}

function boardLabel(board: Board): string {
  return BOARDS.find((option) => option.value === board)?.label ?? board;
}

/** The one-line summary shown in the Profile, e.g. "Class 6–8 · CBSE". */
export function describeClass(info: ClassInfo | null | undefined): string {
  if (!info) return "Not set yet";

  const parts = [rangeLabel(info.range)];
  if (info.board) parts.push(boardLabel(info.board));
  if (info.board === "state" && info.state) parts.push(info.state);
  if (info.institution) parts.push(info.institution);

  const line = parts.join(" · ");
  return info.helping ? `Helping with ${line}` : line;
}

import type { Level } from "./solution";

// Which extras to show for each level.
export interface DisplayProfile {
  sections: boolean; // Given / To find / To prove
  marksKey: boolean; // marks legend
}

export const DISPLAY_PROFILES: Record<Level, DisplayProfile> = {
  "class1-5": { sections: false, marksKey: false },
  "class6-8": { sections: false, marksKey: false },
  "class9-10": { sections: true, marksKey: true },
  "class11-12": { sections: true, marksKey: true },
  college: { sections: false, marksKey: false },
  grad: { sections: false, marksKey: false },
};

export function profileFor(level: Level): DisplayProfile {
  return DISPLAY_PROFILES[level];
}

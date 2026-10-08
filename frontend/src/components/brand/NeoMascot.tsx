import { useId } from "react";
import {
  NEO_HEAD,
  NEO_LEG_LEFT,
  NEO_LEG_RIGHT,
  NEO_VIEWBOX,
} from "./neoShapes";

interface NeoMascotProps {
  className?: string;
  /** Accessible name. Leave empty when Neo is decoration next to text. */
  title?: string;
}

// The 3D edge sits a little below and right of each part, like Honk's letters
const EDGE = "translate(1.5 6)";

/**
 * pi-Neo, the NeoMath mascot, drawn as a rig: each part has its own class
 * (neo-leg-left, neo-head, neo-eyes, neo-pupils, ...) so thinking and loading
 * animations can move them later. In dark mode a white rim appears around him.
 */
const NeoMascot = ({ className = "", title }: NeoMascotProps) => {
  // Each Neo on the page needs its own gradient id
  const gradientId = `neo-gradient-${useId().replace(/:/g, "")}`;
  const parts = [NEO_LEG_LEFT, NEO_LEG_RIGHT, NEO_HEAD];

  return (
    <svg
      viewBox={NEO_VIEWBOX}
      className={`overflow-visible ${className}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="2"
          x2="0"
          y2="96"
        >
          <stop offset="0" stopColor="#fffb9c" />
          <stop offset=".45" stopColor="#ffb46b" />
          <stop offset="1" stopColor="#ee4fa8" />
        </linearGradient>
      </defs>

      {/* White sticker rim, only on dark backgrounds */}
      <g className="hidden dark:inline" fill="#fff" stroke="#fff" strokeWidth="14" strokeLinejoin="round">
        {parts.map((d) => (
          <g key={d}>
            <path d={d} />
            <path d={d} transform={EDGE} />
          </g>
        ))}
      </g>

      <g className="neo-body">
        <g className="neo-leg-left">
          <path d={NEO_LEG_LEFT} transform={EDGE} fill="#000" />
          <path d={NEO_LEG_LEFT} fill={`url(#${gradientId})`} stroke="#000" strokeWidth="5" strokeLinejoin="round" />
        </g>
        <g className="neo-leg-right">
          <path d={NEO_LEG_RIGHT} transform={EDGE} fill="#000" />
          <path d={NEO_LEG_RIGHT} fill={`url(#${gradientId})`} stroke="#000" strokeWidth="5" strokeLinejoin="round" />
        </g>
        <g className="neo-head">
          <path d={NEO_HEAD} transform={EDGE} fill="#000" />
          <path d={NEO_HEAD} fill={`url(#${gradientId})`} stroke="#000" strokeWidth="5" strokeLinejoin="round" />
          <g className="neo-eyes">
            <ellipse cx="42" cy="19" rx="8" ry="9.5" fill="#fff" stroke="#000" strokeWidth="3" />
            <ellipse cx="61" cy="18" rx="8" ry="9.5" fill="#fff" stroke="#000" strokeWidth="3" />
            <g className="neo-pupils">
              <circle cx="40" cy="22" r="4" fill="#000" />
              <circle cx="59" cy="21" r="4" fill="#000" />
              <circle cx="41.5" cy="20.5" r="1.2" fill="#fff" />
              <circle cx="60.5" cy="19.5" r="1.2" fill="#fff" />
            </g>
          </g>
          <g fill="none" strokeLinecap="round">
            {/* Brows get a white backing in dark mode so they don't vanish */}
            <path className="hidden dark:inline" d="M35.5 1 Q42 -2 48.5 0.5 M55 -1 Q61.5 -5 68 -2" stroke="#fff" strokeWidth="10" />
            <path className="neo-brow-left" d="M35.5 1 Q42 -2 48.5 0.5" stroke="#000" strokeWidth="3.4" />
            <path className="neo-brow-right" d="M55 -1 Q61.5 -5 68 -2" stroke="#000" strokeWidth="3.4" />
            <path className="neo-mouth" d="M46 30.5 Q51.5 34.5 57 30" stroke="#000" strokeWidth="3" />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default NeoMascot;

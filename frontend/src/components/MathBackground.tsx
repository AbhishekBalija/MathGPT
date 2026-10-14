import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import { useThemeStore } from "../stores/themeStore";

// The drawing is 2400 units wide and is never stretched (preserveAspectRatio
// "slice" crops instead), so the symbols keep their real shape on every screen.
const WIDTH = 2400;
const HEIGHT = 300;
// Gap between symbols along a wave. One full set (6 symbols) is longer than the
// wave itself, which is what makes the loop seamless (see FlowingWave).
const SPACING = 440;

interface WaveSpec {
  y: number;
  amplitude: number;
  phase: number; // shifts the wave sideways so the four never look parallel
  symbols: string[];
  duration: number; // seconds for one full set of symbols to pass
  direction: 1 | -1;
}

const WAVES: WaveSpec[] = [
  { y: 66, amplitude: 38, phase: 0, symbols: ["∫", "×", "π", "θ", "∂", "λ"], duration: 46, direction: 1 },
  { y: 122, amplitude: 42, phase: 1.3, symbols: ["∑", "∞", "log", "α", "β", "÷"], duration: 52, direction: -1 },
  { y: 178, amplitude: 38, phase: 2.4, symbols: ["ƒ(x)", "√", "e", "σ", "∏", "±"], duration: 44, direction: 1 },
  { y: 234, amplitude: 44, phase: 3.6, symbols: ["d/dx", "∆", "≈", "Ω", "∇", "≠"], duration: 50, direction: -1 },
];

const MathBackground = () => {
  // Read the theme from the same store the toggle uses. Checking the <html>
  // class on mount was too early: the Navbar switches dark mode on after the
  // waves had already picked their light-mode colours.
  const isDark = useThemeStore((state) => state.isDark);
  const fadeId = `wave-fade-${useId().replace(/:/g, "")}`;

  const line = isDark ? "rgba(175, 140, 165, 0.5)" : "rgba(95, 85, 125, 0.34)";
  const symbol = isDark ? "rgba(245, 222, 236, 0.85)" : "rgba(55, 45, 95, 0.7)";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Background gradient, light and dark */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-100 via-white to-gray-50 dark:from-[#1a1218] dark:via-[#120d12] dark:to-[#0a0a0a]" />

      {/* The waves sit behind the hero heading */}
      <div className="absolute top-32 md:top-44 lg:top-52 left-0 right-0">
        <svg
          className="w-full h-40 md:h-56 lg:h-64"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            {/* Fade the waves out at the left and right edges instead of cutting them off */}
            <linearGradient id={`${fadeId}-g`}>
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.18" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.82" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={fadeId}>
              <rect width={WIDTH} height={HEIGHT} fill={`url(#${fadeId}-g)`} />
            </mask>
          </defs>
          <g mask={`url(#${fadeId})`}>
            {WAVES.map((wave) => (
              <FlowingWave key={wave.y} wave={wave} line={line} symbol={symbol} />
            ))}
          </g>
        </svg>
      </div>

      {/* Soft vignette for depth */}
      <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-white/60 dark:from-[#0a0a0a] dark:via-transparent dark:to-[#0a0a0a]/60 opacity-50" />
    </div>
  );
};

/** A smooth sine wave: three full cycles across the drawing. */
const wavePath = ({ y, amplitude, phase }: WaveSpec) => {
  const points: string[] = [];
  for (let x = -40; x <= WIDTH + 40; x += 8) {
    const py = y + amplitude * Math.sin((x / WIDTH) * Math.PI * 6 + phase);
    points.push(`${x === -40 ? "M" : "L"}${x},${py.toFixed(1)}`);
  }
  return points.join(" ");
};

const FlowingWave = ({ wave, line, symbol }: { wave: WaveSpec; line: string; symbol: string }) => {
  // Keep the symbols still for people who ask their system for less motion
  const reduceMotion = useReducedMotion();
  const pathId = `wave-path-${useId().replace(/:/g, "")}`;
  const d = wavePath(wave);

  // Seamless loop: two copies of the symbol set sit SPACING apart along the
  // wave, and each symbol slides by exactly one set's length. When a cycle ends
  // every symbol is where its twin started, so there is no visible jump.
  const setLength = wave.symbols.length * SPACING;
  const strip = [...wave.symbols, ...wave.symbols];

  return (
    <g>
      <path id={pathId} d={d} fill="none" stroke={line} strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      {strip.map((s, i) => {
        const home = i * SPACING - setLength / 2;
        const [from, to] = wave.direction === 1 ? [home, home + setLength] : [home + setLength, home];
        return (
          <text key={i} fill={symbol} fontSize="24" fontFamily="'Times New Roman', serif" fontWeight="500" dy="-8">
            <textPath href={`#${pathId}`} startOffset={from}>
              {!reduceMotion && (
                <animate
                  attributeName="startOffset"
                  from={from}
                  to={to}
                  dur={`${wave.duration}s`}
                  repeatCount="indefinite"
                />
              )}
              {s}
            </textPath>
          </text>
        );
      })}
    </g>
  );
};

export default MathBackground;

import { useEffect, useState } from "react";

const MathBackground = () => {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check initial theme
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  // Colors for light mode (darker waves on light bg) vs dark mode (lighter waves on dark bg)
  const waveColors = isDark
    ? {
        stroke1: "rgba(140, 130, 150, 0.5)",
        stroke2: "rgba(130, 140, 150, 0.45)",
        stroke3: "rgba(140, 125, 145, 0.48)",
        stroke4: "rgba(125, 135, 145, 0.42)",
        symbol1: "rgba(220, 210, 230, 0.85)",
        symbol2: "rgba(210, 220, 230, 0.8)",
        symbol3: "rgba(215, 205, 225, 0.8)",
        symbol4: "rgba(205, 215, 225, 0.75)",
      }
    : {
        stroke1: "rgba(100, 90, 130, 0.35)",
        stroke2: "rgba(90, 100, 130, 0.3)",
        stroke3: "rgba(100, 85, 125, 0.32)",
        stroke4: "rgba(85, 95, 120, 0.28)",
        symbol1: "rgba(60, 50, 100, 0.7)",
        symbol2: "rgba(50, 60, 100, 0.65)",
        symbol3: "rgba(55, 45, 95, 0.65)",
        symbol4: "rgba(45, 55, 90, 0.6)",
      };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Rich Background Gradient - Light & Dark modes */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-100 via-white to-gray-50 dark:from-[#1a1520] dark:via-[#0f1419] dark:to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-linear-to-tr from-blue-100/20 via-transparent to-purple-100/10 dark:from-purple-900/10 dark:via-transparent dark:to-amber-900/5" />

      {/* Container for compact stacked waves - positioned behind hero heading */}
      <div className="absolute top-36 md:top-48 lg:top-56 left-0 right-0 flex justify-center">
        <svg
          className="w-full h-48 md:h-56 lg:h-64"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          {/* Wave 1 */}
          <FlowingWavePath
            yCenter={30}
            amplitude={18}
            strokeColor={waveColors.stroke1}
            symbols={["∫", "×", "π"]}
            symbolColor={waveColors.symbol1}
            duration={28}
            direction={1}
            delay={0}
          />

          {/* Wave 2 */}
          <FlowingWavePath
            yCenter={70}
            amplitude={20}
            strokeColor={waveColors.stroke2}
            symbols={["∑", "∞", "log"]}
            symbolColor={waveColors.symbol2}
            duration={32}
            direction={-1}
            delay={1}
          />

          {/* Wave 3 */}
          <FlowingWavePath
            yCenter={110}
            amplitude={18}
            strokeColor={waveColors.stroke3}
            symbols={["ƒ(x)", "√", "e"]}
            symbolColor={waveColors.symbol3}
            duration={26}
            direction={1}
            delay={2}
          />

          {/* Wave 4 */}
          <FlowingWavePath
            yCenter={150}
            amplitude={22}
            strokeColor={waveColors.stroke4}
            symbols={["d/dx", "∆", "≈"]}
            symbolColor={waveColors.symbol4}
            duration={30}
            direction={-1}
            delay={3}
          />
        </svg>
      </div>

      {/* Soft Vignette Overlay for depth - different for light/dark */}
      <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-white/60 dark:from-[#0a0a0a] dark:via-transparent dark:to-[#0a0a0a]/60 opacity-50" />
      <div className="absolute inset-0 bg-linear-to-r from-white/70 via-transparent to-white/70 dark:from-[#0a0a0a]/70 dark:via-transparent dark:to-[#0a0a0a]/70 opacity-50" />
    </div>
  );
};

const FlowingWavePath = ({
  yCenter,
  amplitude,
  strokeColor,
  symbols,
  symbolColor,
  duration,
  direction,
  delay,
}: {
  yCenter: number;
  amplitude: number;
  strokeColor: string;
  symbols: string[];
  symbolColor: string;
  duration: number;
  direction: number;
  delay: number;
}) => {
  const id = `wave-${Math.random().toString(36).substr(2, 9)}`;

  // Create a smooth horizontal sine wave path
  const createSinePath = () => {
    const points: string[] = [];
    const width = 1200;
    const waveCount = 3; // Number of complete wave cycles

    for (let x = 0; x <= width; x += 4) {
      const y =
        yCenter + amplitude * Math.sin((x / width) * Math.PI * 2 * waveCount);
      if (x === 0) {
        points.push(`M${x},${y}`);
      } else {
        points.push(`L${x},${y}`);
      }
    }
    return points.join(" ");
  };

  const pathData = createSinePath();

  return (
    <g>
      {/* The wave line */}
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* Define path for text to follow */}
      <defs>
        <path id={id} d={pathData} />
      </defs>

      {/* Symbols flowing along the path */}
      <text
        fill={symbolColor}
        fontSize="14"
        fontFamily="serif"
        fontWeight="500"
      >
        <textPath href={`#${id}`} startOffset="0%">
          <animate
            attributeName="startOffset"
            from={direction === 1 ? "-25%" : "100%"}
            to={direction === 1 ? "100%" : "-25%"}
            dur={`${duration}s`}
            repeatCount="indefinite"
            begin={`${delay}s`}
          />
          {symbols.map((s, i) => (
            <tspan key={i} dx={i === 0 ? "50" : "280"}>
              {s}
            </tspan>
          ))}
        </textPath>
      </text>

      {/* Second set for seamless loop */}
      <text
        fill={symbolColor}
        fontSize="14"
        fontFamily="serif"
        fontWeight="500"
      >
        <textPath href={`#${id}`} startOffset="0%">
          <animate
            attributeName="startOffset"
            from={direction === 1 ? "-75%" : "150%"}
            to={direction === 1 ? "50%" : "25%"}
            dur={`${duration}s`}
            repeatCount="indefinite"
            begin={`${delay}s`}
          />
          {symbols.map((s, i) => (
            <tspan key={i} dx={i === 0 ? "50" : "280"}>
              {s}
            </tspan>
          ))}
        </textPath>
      </text>
    </g>
  );
};

export default MathBackground;

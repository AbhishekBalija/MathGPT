import type { CSSProperties } from "react";
import NeoMascot from "./NeoMascot";

interface LogoProps {
  /**
   * Height of the word "NeoMath" (without Neo), as a CSS length. Pass a CSS
   * variable to make it responsive, e.g. "var(--logo-h)" with
   * className="[--logo-h:22px] md:[--logo-h:28px]".
   */
  height?: string;
  className?: string;
}

// Measurements of the baked wordmark (public/brand/neomath-wordmark.svg),
// all in multiples of the wordmark's height. See docs/brand.md.
const WORD_WIDTH = 5.0014; // 7252 / 1450
const DARK_SCALE = 1.0759; // dark file is 1560 tall: same letters plus a white rim
const DARK_RIM = 0.0379; // the rim adds 55 units on every side
const NEO_WIDTH = 0.92;
const NEO_LEFT = 4.1455; // centres Neo over the 'h'
const NEO_RISE = 0.346; // how far Neo's head sits above the top of the word
const BOX_WIDTH = 5.0655; // Neo's right edge pokes slightly past the 'h'

const times = (h: string, n: number) => `calc(${h} * ${n})`;

/** The NeoMath logo: Honk wordmark with pi-Neo sitting on the 'h'. */
const Logo = ({ height = "28px", className = "" }: LogoProps) => {
  const box: CSSProperties = {
    width: times(height, BOX_WIDTH),
    height: times(height, 1 + NEO_RISE),
  };
  const word: CSSProperties = {
    top: times(height, NEO_RISE),
    height,
    width: times(height, WORD_WIDTH),
  };
  // Positioned inside the word box, so only the rim needs undoing
  const darkWord: CSSProperties = {
    top: times(height, -DARK_RIM),
    left: times(height, -DARK_RIM),
    height: times(height, DARK_SCALE),
    maxWidth: "none",
  };
  const neo: CSSProperties = {
    left: times(height, NEO_LEFT),
    width: times(height, NEO_WIDTH),
  };

  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={box}
      role="img"
      aria-label="NeoMath"
    >
      <span className="absolute left-0" style={word}>
        <img
          src="/brand/neomath-wordmark.svg"
          alt=""
          className="block h-full w-full dark:hidden"
          draggable={false}
        />
        <img
          src="/brand/neomath-wordmark-dark.svg"
          alt=""
          className="absolute hidden dark:block"
          style={darkWord}
          draggable={false}
        />
      </span>
      <span className="absolute top-0" style={neo}>
        <NeoMascot className="block w-full h-auto" />
      </span>
    </span>
  );
};

export default Logo;

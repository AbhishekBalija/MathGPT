import katex from "katex";
import "katex/dist/katex.min.css";

interface MathProps {
  latex: string;
  display?: boolean;
}

// Draws LaTeX with KaTeX. Bad LaTeX is shown as text instead of throwing.
export function Math({ latex, display = false }: MathProps) {
  const html = katex.renderToString(latex, { displayMode: display, throwOnError: false });
  // The wide-math wrapper scrolls sideways so it never widens the page.
  return (
    <span
      className={display ? "block overflow-x-auto" : "inline-block max-w-full overflow-x-auto align-middle"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

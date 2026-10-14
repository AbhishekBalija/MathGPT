import katex from "katex";
import "katex/dist/katex.min.css";
import { titleAsLatex } from "./titleAsLatex";

// One line in the history list: typed LaTeX is drawn as math, everything else as text.
export function ProblemTitle({ problem }: { problem: string }) {
  const latex = titleAsLatex(problem);
  if (!latex) return <>{problem}</>;

  const html = katex.renderToString(latex, { throwOnError: false });
  // KaTeX draws a bit bigger than the text around it, so bring it back to the list's size
  return <span className="[&_.katex]:text-[1em]" dangerouslySetInnerHTML={{ __html: html }} />;
}

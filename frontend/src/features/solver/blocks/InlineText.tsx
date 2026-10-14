import { Math } from "./Math";

// Text with inline math: $...$ pieces become KaTeX, the rest stays plain text.
// Splitting on $...$ puts the math pieces at the odd positions.
export function InlineText({ text }: { text: string }) {
  const parts = text.split(/\$([^$]+)\$/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <Math key={i} latex={part} /> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

import { Math } from "./Math";

// Splitting on $...$ puts the math pieces at the odd positions.
export function TextBlock({ text }: { text: string }) {
  const parts = text.split(/\$([^$]+)\$/);
  return (
    <p className="text-base leading-relaxed text-gray-900 dark:text-gray-100">
      {parts.map((part, i) =>
        i % 2 === 1 ? <Math key={i} latex={part} /> : <span key={i}>{part}</span>,
      )}
    </p>
  );
}

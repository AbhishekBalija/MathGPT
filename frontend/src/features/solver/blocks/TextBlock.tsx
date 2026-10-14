import { InlineText } from "./InlineText";

export function TextBlock({ text }: { text: string }) {
  return (
    <p className="text-base leading-relaxed text-gray-900 dark:text-gray-100">
      <InlineText text={text} />
    </p>
  );
}

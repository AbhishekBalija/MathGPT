import NeoMascot from "../../components/brand/NeoMascot";

interface QuestionHeaderProps {
  question: string;
  why: string;
}

/**
 * The top of each Onboarding question: the question as a big heading, Neo
 * peeking in at its top right, and one line saying why we ask.
 */
export function QuestionHeader({ question, why }: QuestionHeaderProps) {
  return (
    <div className="relative mb-4">
      <h1 className="pr-20 text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-50">
        {question}
      </h1>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">{why}</p>
      <NeoMascot className="absolute -top-1 right-0 w-16 rotate-[8deg]" />
    </div>
  );
}

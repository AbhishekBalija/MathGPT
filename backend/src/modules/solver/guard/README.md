# Problem Guard

A free check every Problem passes before an instant answer, the cache or the
AI. It lets the Problem through, or turns it away with a **Rejection Reason**
so the student gets a reply written for that case. A turned-away Problem
spends no Credit, makes no AI call and is never saved.

## How it works

1. `problem-shape.ts` reads the text once into a **Problem Shape**: the
   numbers, words, operators and the two sides of any `=`.
2. `check-problem.ts` runs the rules below in order. The first rule that
   matches wins.
3. The solve route answers `422` with `code: "NOT_MATH"` and the `reason`.
   The frontend picks the reply in `frontend/src/utils/errorMessages.ts`.

## The rules, in order

| # | File | Reason | Turns away |
| - | ---- | ------ | ---------- |
| 1 | `rules/wellbeing.ts` | `wellbeing` | "i want to die" (kind reply + helpline, always wins) |
| 2 | `rules/unsafe.ts` | `unsafe` | drugs, making weapons, sexual content, threats |
| 3 | `rules/empty.ts` | `empty` | nothing typed |
| 4 | `rules/personal-info.ts` | `personal_info` | phone numbers, emails, links, ID numbers |
| 5 | `rules/greeting.ts` | `greeting` | "hi", "thanks", "ok" |
| 6 | `rules/off-topic.ts` | `off_topic` | essays, jokes, code, general knowledge, tricks |
| 7 | `rules/number.ts` | `number` | "887", "₹500", "50%", "10:30" |
| 8 | `rules/missing-problem.ts` | `missing_problem` | "solve this", "q3", "ex 5.2 q4" |
| 9 | `rules/incomplete.ts` | `incomplete` | "= 5", "x =", "1 +" |
| 10 | `rules/not-math.ts` | `not_math` | anything else with no math in it |

The guard only catches the obvious cases. The AI still turns away anything
subtle that gets past it.

## How to add a case

All cases live in one table: `backend/tests/unit/guard/guard-cases.ts`.

1. Add the text under `MUST_BLOCK` with the reason it should get, or under
   `MUST_PASS` if it is a real problem that must never be turned away.
2. Run `bun run test tests/unit/guard`. If it fails, the rule needs a change.
3. Usually that is one word or phrase in the list at the top of the rule's
   file. Keep phrases narrow: a word that appears in any textbook problem
   ("bomb", "gun", "story", "history") does not belong in a block list.
4. Run the tests again. Every `MUST_PASS` row must still pass.

## How to add a new rule

1. Create `rules/<name>.ts` like the others: a comment saying what it turns
   away and the reply, the word list, then the rule.
2. Add the reason to `RejectionReason` and the rule to `RULES` in
   `check-problem.ts`, in the right place in the order.
3. Add its rows to the table, and its reply to `GUARD_REPLIES` in
   `frontend/src/utils/errorMessages.ts`. Until you do, students see the
   general "doesn't look like a math problem" line.

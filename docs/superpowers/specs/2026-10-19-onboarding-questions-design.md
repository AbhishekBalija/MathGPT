# Onboarding questions

Right after sign-up, Neo asks two quick questions: which class the student is
in, and their board or university. The answers are saved on the User so
solutions can follow them later (#129). Agreed with the owner on 19 Oct 2026
(two grilling rounds, issue #39). Look: `onboarding-v1.html` from the design
round (Hello, Class, Board, College, Profile), with the question header from
option C in `class-header-v2.html`.

## The flow

Shown once, as its own full screen at `/welcome`, the first time a student
reaches the app after sign-up (email or Google). Accounts that existed before
this ships see it on their next visit too.

1. **Hello.** Neo says "Hi, I'm Neo!" and "Two quick questions, so your steps
   fit your class. It takes 10 seconds." Button: **Let's go**.
2. **Class.** The question "Which class are you in?" is a large left-aligned
   heading, with Neo peeking in at its top right, slightly tilted. Under it, at
   full width: "So Neo shows the right amount of steps. You can change it any
   time." Five rows, each with a real problem from that range:

   | Row | Example shown | Saved as |
   | --- | --- | --- |
   | Class 1–5 | `156 ÷ 4` | `class_1_5` |
   | Class 6–8 | `3x + 5 = 20` | `class_6_8` |
   | Class 9–10 | `x² + 5x + 6 = 0` | `class_9_10` |
   | Class 11–12 (second line: PU · Diploma) | `d/dx (sin x)` | `class_11_12` |
   | College & above | `∫ x eˣ dx` | `college` |

   Under the rows, a quiet link: **I'm a parent or teacher**. It keeps the same
   rows and changes the question to "Which class are you helping with?". It
   saves `helping: true`.
3. **Board.** Depends on the row picked.
   - **Any school row (Class 1–5 to 11–12):** "Which board is your school?",
     with "Boards write answers a little differently." Six chips: CBSE,
     ICSE / ISC, State board, IB, Cambridge, Other. Picking **State board**
     shows "Which state?", a list of Indian states and union territories with
     Karnataka first. Button: **Done**.
   - **College & above:** "Which university or college?", one optional text box
     (placeholder "e.g. VTU, Christ University", at most 120 characters).
     Button: **Done**.

Steps 2 and 3 share the same header: the question as the big heading, Neo
peeking at its top right, and the why line under it. Every screen has **Skip**
at the top right ("Skip for now" on Hello). On steps 2 and 3 a back arrow and
a thin two-step line sit between the top corners. Continue and Done
stay grey until something is picked (the college text box may stay empty).
**Done** saves and opens the solver. Skip on Hello or Class saves nothing but
the fact that the student skipped. Skip on the Board step keeps the class they
picked and leaves the board empty (a young child may know their class but not
their board). Either way the solver opens next. Solving is never blocked.

On a laptop the same steps sit in a centred column about 440px wide. Dark mode
uses the app's existing dark colours. No new animation: steps swap like the
rest of the app.

## Changing it later: the Profile popup

Clicking your name in the sidebar opens the Profile popup. It gets the new
look from the design round:

- Avatar, name and email
- **Your class**: "Class 6–8 · CBSE" (or "Not set yet"), with a **Change**
  button that opens steps 2 and 3 in the popup. Saving there returns to the
  Profile.
- Problems solved, and the month you joined
- The problem-type bars are removed (most solves show as "Other")

How the class line reads: the row label, then the board ("State board ·
Karnataka" for a state board), or the university, or nothing when it was left
empty ("Class 1–5"). A parent or teacher sees "Helping with Class 6–8 · CBSE".

## Data

New columns on `users` (migration `0012_onboarding`, all nullable, no data
copy):

| Column | Type | Notes |
| --- | --- | --- |
| `class_range` | text | One of the five values above, checked by the database |
| `helping` | boolean, default false | A parent or teacher |
| `board` | text | `cbse`, `icse`, `state`, `ib`, `cambridge` or `other`; school rows only |
| `board_state` | text | Only when `board` is `state`, at most 40 characters |
| `institution` | text | College row only, at most 120 characters |
| `class_set_at` | timestamptz | When the class was last saved |
| `onboarding_skipped_at` | timestamptz | When the student skipped |

A student **needs onboarding** when `class_range` and `onboarding_skipped_at`
are both empty. Team accounts and admins see it too, so the owner can check it.

No age or date of birth is asked. Parental consent (#40) will ask what it
needs when it ships, and can add its own step to this flow.

## API

- `GET /auth/me` and every auth response add `onboarding: "needed" | "done"`
  and `classInfo: { range, helping, board, state, institution } | null`.
- `PUT /api/profile/class` (logged in) with
  `{ range, helping, board?, state?, institution? }`, checked with zod:
  - `board` only for school ranges, and optional for them (Skip on the Board
    step sends the class alone)
  - `state` required when `board` is `state`, otherwise not allowed
  - `institution` only for `college`, trimmed, empty becomes null
  - Answers `200` with the updated user, or `400 { code: "INVALID_CLASS" }`
- `POST /api/profile/class/skip` (logged in) sets `onboarding_skipped_at` if
  it is empty and answers `200` with the updated user. Skipping again does
  nothing.
- Saving a class clears nothing else: a student who skipped and later sets a
  class from the Profile is simply "done".

## Frontend

- `/welcome` is a protected route. The app layout sends a student who needs
  onboarding there once per visit, and `/welcome` sends anyone who is done to
  `/app`.
- The class and board steps are one component used by both `/welcome` and the
  Profile popup, so they can't drift apart.
- The state list lives in the frontend only; the API checks length, not the
  name.

## Testing

- **API (`PUT /api/profile/class`, skip, `/auth/me`):** a new user needs
  onboarding; saving a school class with a board makes it done and `/auth/me`
  shows it; a school class with no board is saved too; a state board needs a
  state; a board on `college` or an
  institution on a school row is a 400; skipping makes it done and saves no
  class; skipping twice keeps the first time.
- **Frontend (the shared steps component):** Continue stays grey until a row is
  picked; a school row leads to board chips and State board shows the state
  list; College leads to the text box; the parent or teacher link changes the
  question; Skip calls skip.
- **Profile popup:** shows "Class 6–8 · CBSE" and Change opens the steps;
  shows "Not set yet" with no class.
- Screenshots for the PR: Hello, Class, Board, College, Profile, on phone and
  desktop, light and dark.

## Rollout

- Migration `0012_onboarding` goes to Neon preview, then production, before
  merge (the owner runs it, as with earlier migrations).
- One PR for the backend and one for the frontend, as with Settings.
- Version 1.8.0.

## Not in this work

- Using the answers in solutions (#129)
- Age, date of birth or parental consent (#40)
- A yearly "still in this class?" nudge, or a later reminder after skipping
- Students-by-class counts in admin or the monitor

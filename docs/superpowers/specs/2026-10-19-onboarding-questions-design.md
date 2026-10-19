# Onboarding questions

Right after sign-up, Neo asks who is using NeoMath (a student, a parent or a
teacher), which class, and the board or university. The answers are saved on
the User so solutions can follow them later (#129). Agreed with the owner on
19 Oct 2026 (four grilling rounds, issue #39). Look: the design round's
`onboarding-v1.html` (class rows, board chips, Profile), `class-header-v2.html`
option C (the question header), `role-v4.html` option A (the role rows) and
`motion-v1.html` (the motion, minus everything Neo does).

## The flow

Shown once, as its own full screen at `/welcome`, the first time a student
reaches the app after sign-up (email or Google). Accounts that existed before
this ships see it on their next visit too.

1. **Hello.** Neo says "Hi, I'm Neo!" and "A few quick questions, so your steps
   fit your class. It takes 10 seconds." Button: **Let's go**.
2. **Who's using NeoMath?** Under it: "If you're not sure, you can change it
   later." Three plain rows, each with a name, one line and a radio circle (no
   icons):

   | Row | Line | Saved as |
   | --- | --- | --- |
   | Student | I'm learning math | `student` |
   | Parent | I help my child with homework | `parent` |
   | Teacher | I teach a class | `teacher` |

3. **Class.** The question depends on the role. Five rows, each with a real
   problem from that range:

   | Row | Example shown | Saved as |
   | --- | --- | --- |
   | Class 1–5 | `156 ÷ 4` | `class_1_5` |
   | Class 6–8 | `3x + 5 = 20` | `class_6_8` |
   | Class 9–10 | `x² + 5x + 6 = 0` | `class_9_10` |
   | Class 11–12 (second line: PU · Diploma) | `d/dx (sin x)` | `class_11_12` |
   | College & above | `∫ x eˣ dx` | `college` |

   | Role | Question | Why line | Picks |
   | --- | --- | --- | --- |
   | Student | Which class are you in? | So Neo shows the right amount of steps. You can change it any time. | one |
   | Parent | Which class is your child in? | More than one? Pick the one you'll help most. You can change it any time. | one |
   | Teacher | Which classes do you teach? | Pick all that apply. | one or more (rows get a square checkbox) |

4. **Board.** Depends on the classes picked.
   - **Only school classes:** "Which board is your school?" ("their school"
     for a parent), with "Boards write answers a little differently." Six chips:
     CBSE, ICSE / ISC, State board, IB, Cambridge, Other. **State board** shows
     "Which state?", a list of Indian states and union territories with
     Karnataka first.
   - **Only College & above:** "Which university or college?", one optional text
     box (placeholder "e.g. VTU, Christ University", at most 120 characters).
   - **Both (a teacher):** "Where do you teach?" with the board chips and the
     optional university box under them.
   - Button: **Done**.

Every question step shares one header: the question as a big left-aligned
heading, Neo peeking in at its top right (still, no animation), and the why
line under it. **Skip** sits at the top right ("Skip for now" on Hello). Steps
2–4 have a back arrow and a thin three-part step bar between the corners.
Continue and Done stay grey until something is picked (the university box may
stay empty).

**Skipping:**
- On Hello or the role step: saves only that the student skipped.
- On the class step: keeps the role, no classes.
- On the board step: keeps the role and classes, no board.
- If a skip fails to save, the app opens anyway. Solving is never blocked.

On a laptop the steps sit in a centred column about 440px wide. Dark mode uses
the app's existing dark colours.

## Motion

Quiet, fast, transform and opacity only. Neo does not move in this work: his
redesign and animation are #132.

| Motion | Timing |
| --- | --- |
| Steps slide: the next step comes in 24px from the right with a fade, Back the other way | 240ms, ease-out |
| Step bar fills (transform, not width) | 300ms, ease-out |
| The picked radio dot or checkbox tick pops from 0 | 160ms, ease-out |
| Rows and chips arrive one after another, 8px up with a fade, 30ms apart | 200ms each |
| Buttons, rows and chips dip to 97% while pressed | 100ms |

With "reduce motion" on, none of these play. Buttons work the moment a step
appears; nothing waits for an animation.

## Changing it later: the Profile popup

Clicking your name in the sidebar opens the Profile popup, with the new look:

- Avatar, name and email
- **You**: one line led by the role, with a **Change** button that opens steps
  2–4 in the popup. Saving there returns to the Profile.
- Problems solved, and the month you joined
- The problem-type bars are removed (most solves show as "Other")

How the line reads: role, classes (a teacher's are listed, "Class 6–8, 9–10"),
then the board ("State board · Karnataka" for a state board) and the university
when given. Examples: "Student · Class 9–10 · State board · Karnataka",
"Parent · Class 1–5 · CBSE", "Teacher · Class 6–8, 9–10 · CBSE",
"Student · College & above · VTU". "Not set yet" when nothing was answered.

## Data

Migration `0012_onboarding` (already on preview and production) added the
columns. Migration `0013_onboarding_roles` changes them before anything uses
them: it adds `role` and `class_ranges`, and drops `class_range` and `helping`.
Both dropped columns are empty everywhere, because the page that writes them
never shipped (checked right before the migration runs).

| Column | Type | Notes |
| --- | --- | --- |
| `role` | text | `student`, `parent` or `teacher`, checked by the database |
| `class_ranges` | text[], default empty | Each one of the five values, checked by the database |
| `board` | text | `cbse`, `icse`, `state`, `ib`, `cambridge` or `other` |
| `board_state` | text | Only when `board` is `state`, at most 40 characters |
| `institution` | text | Only when College & above is picked, at most 120 characters |
| `class_set_at` | timestamptz | When the answer was last saved |
| `onboarding_skipped_at` | timestamptz | When the student skipped |

A student **needs onboarding** when `role` and `onboarding_skipped_at` are both
empty. Team accounts and admins see it too, so the owner can check it.

No age or date of birth is asked. Knowing someone is a parent will help the
parental consent work (#40), which will ask what it needs when it ships.

## API

- `GET /auth/me` and every auth response add `onboarding: "needed" | "done"`
  and `classInfo: { role, ranges, board, state, institution } | null`.
- `PUT /api/profile/class` (logged in) with
  `{ role, ranges?, board?, state?, institution? }`, checked with zod:
  - `role` is required
  - `ranges` may be empty or left out (a skip on the class step). When given,
    a student or parent sends exactly 1, a teacher 1 to 5, with no repeats
  - `board` only when at least one school range is picked
  - `state` required when `board` is `state`, otherwise not allowed
  - `institution` only when `college` is picked; trimmed, empty becomes null
  - Every answer column is written, so a change clears what no longer applies
  - Answers `200` with the updated user, or `400 { code: "INVALID_CLASS" }`
- `POST /api/profile/class/skip` (logged in) sets `onboarding_skipped_at` if it
  is empty and answers `200` with the updated user. Skipping again does nothing,
  and a saved answer stays.

## Frontend

- `/welcome` is a protected route. The app layout refreshes the user from
  `/auth/me` once per visit and sends a student who needs onboarding to
  `/welcome` once per visit (per browser tab). The flag is forgotten at log out,
  so the next person on a shared phone is still asked.
- The role, class and board steps are one component used by `/welcome` and the
  Profile popup, so they can't drift apart.
- The state list lives in the frontend only; the API checks length, not the
  name.

## Testing

- **API:** a new user needs onboarding; a student, a parent and a teacher with
  several classes save and read back through `/auth/me`; a role alone is
  saved; a student with two classes, a teacher with six or repeated classes, a
  board with only college, and an institution with no college are 400s; a
  state board needs a state; a teacher with school and college can send both a
  board and an institution; changing the answer clears what no longer applies;
  skip and skip-twice; skip keeps a saved answer.
- **Frontend (the shared steps):** Continue stays grey until a pick; each role
  asks its own class question; a teacher can pick several; school leads to the
  chips and State board to the state list; college to the box; both to both;
  Skip on each step sends what the spec says; starts from a saved answer.
- **Profile:** the line for each role; "Not set yet"; Change and save.
- Screenshots: Hello, role, class (student and teacher), board, mixed, college,
  Profile, on phone and desktop, light and dark.

## Rollout

- Migration `0013_onboarding_roles` goes to Neon preview, then production,
  before #130 merges (the owner runs it).
- #130 (API) merges first, then #131 (the pages).
- Versions 1.8.0 (API) and 1.9.0 (pages).

## Not in this work

- Neo's animation, and the mascot redesign that gives him a body (#132)
- Using the answers in solutions (#129)
- Age, date of birth or parental consent (#40)
- Separate profiles per child, or parent and teacher features
- A yearly "still in this class?" nudge, or a reminder after skipping
- Students-by-role counts in admin or the monitor

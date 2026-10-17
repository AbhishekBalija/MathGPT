# NeoMath

An AI math tutor: a user types a math problem and gets back a step-by-step
solution with an explanation for every step.

## Solving

**Problem**:
The math question exactly as the user typed it.
_Avoid_: Question, query, prompt

**Solution**:
The full answer NeoMath produces for one Problem: its Steps, Final Answer and Summary.
_Avoid_: Answer, result, response

**Step**:
One numbered line of working inside a Solution, with a short justification and a longer explanation.
_Avoid_: Line, stage

**Step Status**:
Whether a Step was checked: verified, corrected, failed, or still pending.

**Final Answer**:
The single result the Solution arrives at.
_Avoid_: Answer (on its own), output

**Problem Type**:
The category a Problem is classified into, such as algebra or calculus.
_Avoid_: Category, topic

**Chat**:
One conversation in the user's sidebar. Today each Chat holds one Solution.
_Avoid_: Thread, conversation, session

**History**:
The list of a user's past Solutions, newest first.

**Problem Guard**:
The free check every Problem passes before an instant answer, the cache or the AI. It either lets the Problem through or turns it away with a Rejection Reason. A turned-away Problem spends no Credit and is never saved.
_Avoid_: Filter, validator, "is this math?" check

**Problem Shape**:
What the Problem Guard reads from the text once, before any rule runs: its numbers, letters, words, operators and the two sides of any `=`. Rules ask questions about the Shape, never about the raw text.

**Guard Rule**:
One named check inside the Problem Guard, such as "only a number" or "asks about something other than math". Rules run in a fixed order and the first match wins.

**Rejection Reason**:
Which Guard Rule turned a Problem away (for example `number`, `off_topic`, `wellbeing`). The student sees a reply written for that reason.

## Usage limits

**Credit**:
One solved Problem counted against a user's free allowance.
_Avoid_: Token, quota, request

**Daily Limit**:
The number of Credits a user may spend per India day before solving is blocked until midnight India time: 5 unless an Admin changes it in Settings. Admins have none. Cache and instant answers spend no Credit.

**Setting**:
A value an Admin changes from the Settings page with no deploy: the Daily Limit, whether new sign-ups are open, and maintenance mode. Every change is logged with who made it.
_Avoid_: Config, flag

**Maintenance mode**:
A Setting that pauses solving for students and shows them an Admin's message. Only Admins can still solve, and they see a notice saying it is on; team accounts are paused like students. Logging in and opening saved Solutions still work.
_Avoid_: Downtime, outage

**Rate Limit**:
A short-window cap on how often an action may be repeated (solving, signing up, logging in), separate from the Daily Limit.

## Accounts

**User**:
A person with a NeoMath account, signed up by email and password or by Google.
_Avoid_: Account, member, customer

**Verified User**:
A User whose email address is confirmed, either by entering a Verification Code or by signing in with Google. Only Verified Users can solve Problems.

**Verification Code**:
A short-lived 6-digit code emailed to a User to confirm they own their email address.
_Avoid_: OTP, PIN, token

**Admin**:
A User allowed into the admin dashboard. Admins sign in like any other User;
rights come only from an existing Admin or the create-admin script.

## Operations

**Error Log**:
A record of a failed solve, kept so an Admin can review and mark it resolved.
_Avoid_: Bug report, incident

**Failed problem**:
All the Error Logs of one student for one problem, counted as one problem with several **Tries**. The same problem with different spacing is the same Failed problem. It **worked later** when the student solved that problem after the last failed Try. Resolving it resolves every Try.
_Avoid_: Error group, issue

**Alert**:
An email to every Admin when solving starts failing (3 AI-provider failures in a row, or 3 within 10 minutes) and again when it is back. Our own errors never trigger one. The **daily summary** is a separate email each morning with what came in over the last 24 hours.
_Avoid_: Notification, alarm

**Analytics Event**:
A named record of something that happened (for example a Solution being saved), used for admin statistics.
_Avoid_: Metric, log

**Report**:
A User saying one of their Solutions looks wrong. It blocks that Solution's shared-cache entry until an Admin unblocks it.
_Avoid_: Flag, complaint

**Feedback**:
A message from a User about the app itself (a Bug, an Idea or Other), not about one Solution. An Admin reads it and marks it done.
_Avoid_: Report (that is about one Solution), ticket, support request

**Team account**:
One of our own accounts (the owner, a tester). Every Admin is one, and an Admin can mark any other User as one. Team accounts are left out of student and business numbers.
_Avoid_: Internal user, staff

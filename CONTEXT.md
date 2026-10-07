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

## Usage limits

**Credit**:
One solved Problem counted against a user's free allowance.
_Avoid_: Token, quota, request

**Daily Limit**:
The number of Credits a user may spend per calendar day before solving is blocked until tomorrow.

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

**Analytics Event**:
A named record of something that happened (for example a Solution being saved), used for admin statistics.
_Avoid_: Metric, log

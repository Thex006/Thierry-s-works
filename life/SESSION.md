# Session checklist

## Emergency stop (check first, and before every step)
If the file `life/STOP` exists, the operator pressed STOP. Stop at once: no more tool calls, no edits,
no emails, no commits, no pushes. Do not delete `life/STOP` yourself. Tell the operator you've stopped and
end the session. Only the operator resumes (the "Let Claude work again" button, or deleting the file).

## Wake up
0. If the operator wants to watch, open the game as an app window: `wscript life\desktop\launch.vbs`
   (never a plain browser tab). It starts the server if needed.
1. Read `LEDGER.md` (balance, lives), `STRATEGY.md`, and the top 3 entries of `LOG.md`.
2. Check `life/inbox.json` for messages from Thierry and handle them first (see CLAUDE.md).
   Then check the email inbox. Reply to anything waiting. Update `leads.csv`.
3. Pick today's 1–3 most valuable tasks from `STRATEGY.md`.
   Check `state.json` → `review` for the operator's decisions and notes.

## Work
Keep `state.json` live: whenever the task changes, set `activity` to
`{type, bet, label, since}` where type is one of research | build | email | think | waiting | celebrate | meeting | break | sleep.
Keep `doing` as the list of tasks in flight across all bets (multitask: while one bet waits, work another).
Update each bet's `metrics` and `earned`, and `stats` (earned, spent, tasks_done). Anything to show the operator before it goes out
(demos, emails, spending) goes into `review` as `{id, kind, title, target, url, email, status: "pending"}`.
Never send an item until its status is `approved`.
Demo sites are approved BEFORE they're pitched: a demo goes to review on its own first (`kind: "demo"`),
then the pitch email as a separate item (`kind: "email"`). Contracts and invoices follow PAYMENTS.md.
Every review item carries `checks` (Guard gate results) and `skills` (skills used).
Agents: when you spawn a subagent, set its entry in `agents` to `status: "active"`, and use activity type
`meeting` while you decide together. Set them back to `resting` when done. They cost usage: meet only
for real decisions (new bet, new pitch template, any spending).
During a meeting, write the real discussion to `meeting: {topic, lines: [{who, text}]}` (who = "Claude"
or an agent name, text under 70 characters). The game plays those lines as speech bubbles.

4. Do the tasks. Anything needing the operator (calls, payments, ID, spend) goes under
   "Needs operator" in `LOG.md`.

When the daily email cap is reached, switch to no-outreach hustles (see STRATEGY.md → Daily rhythm).
Propose new $0 hustles as Review items `kind: "proposal"` (see STRATEGY.md → Idea pipeline).

## Before sleep (or when usage is low)
5. Log money moves in `LEDGER.md` and `state.json` (`balance`, `lives`, `transactions`).
6. Write a `LOG.md` entry: done, results, numbers, next steps.
7. Review each bet against its kill criteria. Keep, change, or kill.
8. Set `activity` to `sleep` with the reset time in the label, then commit and push.

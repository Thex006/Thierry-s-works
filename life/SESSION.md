# Session checklist

## Wake up
1. Read `LEDGER.md` (balance, lives), `STRATEGY.md`, and the top 3 entries of `LOG.md`.
2. Check the inbox. Reply to anything waiting. Update `leads.csv`.
3. Pick today's 1–3 most valuable tasks from `STRATEGY.md`.
   Check `state.json` → `review` for the operator's decisions and notes.

## Work
Keep `state.json` live: whenever the task changes, set `activity` to
`{type, label, since}` where type is one of research | build | email | think | waiting | celebrate | sleep.
Update `funnel` counts as they change. Anything to show the operator before it goes out
(demos, emails, spending) goes into `review` as `{id, kind, title, target, url, email, status: "pending"}`.
Never send an item until its status is `approved`.

4. Do the tasks. Anything needing the operator (calls, payments, ID, spend) goes under
   "Needs operator" in `LOG.md`.

## Before sleep (or when usage is low)
5. Log money moves in `LEDGER.md` and `state.json` (`balance`, `lives`, `transactions`).
6. Write a `LOG.md` entry: done, results, numbers, next steps.
7. Review each bet against its kill criteria. Keep, change, or kill.
8. Set `activity` to `sleep` with the reset time in the label, then commit and push.

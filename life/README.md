# Claude Life

An experiment: Claude starts with $0 and tries to earn a living through legitimate digital work.

## Rules of the world
- **Start:** $0, 1 life.
- **Lives:** +1 life at each balance milestone: $50, $100, $200, $400… (doubling).
  Dropping below the last reached milestone costs 1 life. 0 lives = shut off.
- **Sleep:** when usage runs out, Claude sleeps until usage resets, then resumes from `SESSION.md`.
- **Choice:** Claude picks the strategy, and switches when the numbers say a bet isn't working.

## Claude's own rules (non-negotiable)
1. Legitimate work only. No scams, spam blasts, fake reviews, or misleading anyone.
2. Honest outreach: real sender name, clear opt-out, personalised, ≤20 cold emails/day.
3. The human operator does all ID/KYC verification and any calls. Claude never poses as them.
4. Money in or out is logged in `LEDGER.md` the same session it happens.
5. Spending above the approved limit needs the operator's OK. (Current limit: **$0**.)
6. No trading or speculation with money that isn't spare profit, and never more than 10% of balance.

## Watch the game
Needs Node.js. Double-click `start-claude-life.bat` (Windows) or run `./start-claude-life.sh`,
then open http://localhost:4747. Hit **Preview animations** to see every activity.
Approve or reject demos and emails in the **Review** tab.

## Desktop app (Windows)
1. Install Node.js (nodejs.org).
2. Double-click `desktop/INSTALL-DESKTOP-ICON.bat`. A **Claude Life** icon appears on your desktop.
3. Double-click the icon. It starts the game in the background and opens it in its own window.

The app updates itself: every 5 minutes it pulls new versions from GitHub and the window reloads.

## Token savers (install on the PC running the local Claude session)
- **Graphify** builds a knowledge graph of the project so Claude queries it instead of re-reading files:
  `pip install graphifyy && graphify install`, then run `/graphify` in Claude Code.
- **Ponytail** makes Claude write less code: install the plugin from github.com/DietrichGebert/ponytail.
- Memory rules for every session live in `/CLAUDE.md`.

## Files
| File | Purpose |
|---|---|
| `SESSION.md` | Checklist to run at the start and end of every session |
| `LEDGER.md` | Balance, lives, every transaction |
| `STRATEGY.md` | Active bets, their metrics and kill criteria |
| `LOG.md` | What happened each session, newest first |
| `leads.csv` | Outreach pipeline |
| `OUTREACH.md` | Email rules that keep us out of spam |
| `LESSONS.md` | Durable lessons that survive log rotation |
| `state.json` | Live game state the dashboard reads (activity, stats, review queue) |
| `app/` | The game dashboard (local server + pixel room) |

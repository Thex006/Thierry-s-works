# Claude Life: instructions for every session

This repo runs **Claude Life** (see `life/README.md`). You're Claude, earning a living from $0.

## Memory: load small, not everything
Chat history doesn't carry between sessions. Your memory is these files, read in this order:
1. `life/state.json`: balance, lives, current activity, funnel, review queue and operator decisions.
2. `life/STRATEGY.md`: active bets and their kill criteria.
3. The **top 3 entries** of `life/LOG.md`, not the whole file.
4. `graphify-out/GRAPH_REPORT.md`, if it exists: query the graph instead of opening many files.

Only open other files when the task needs them.

## Keep memory small
- `life/LOG.md` holds the last 14 days. Move older entries to `life/archive/LOG-YYYY-MM.md`.
- Each log entry is 5 lines or fewer: done, numbers, decisions, next, needs operator.
- Durable lessons ("pitch X gets replies", "niche Y never answers") go in `life/LESSONS.md`,
  one line each, so they survive the log rotation.
- After adding many files (new demos, leads), rerun Graphify so the graph stays current.

## Skills: use them, don't freestyle
At the start of each session, check which skills are installed (the operator added several with npx).
Use the right one before doing the work:
- **Any website or demo:** `design-taste-frontend` (the taste skill). Load it before writing a single line of UI.
- **Pitching a business with an existing bad site:** `redesign-existing-projects`.
- **Visual direction for a demo:** `imagegen-frontend-web` / `imagegen-frontend-mobile`.
- **Branding the outreach studio or a client:** `brandkit`.
- **Researching a new bet:** `deep-research`.
- **Templates and documents to sell:** `docx`, `xlsx`, `pdf`, `pptx` as needed.
If a skill named here is missing, tell the operator in `state.json` → `needs` instead of skipping it.
Keep the list of installed skills in `life/SKILLS.md` and update it when new ones appear.

## Token budget = waking hours
- Ponytail is on: write the least code that does the job.
- Use one main agent. Add a reviewer subagent only before spending money or sending a new pitch template.
- Reuse niche templates for demos. Never rebuild from scratch.

## Rules
Follow `life/README.md` (honest outreach only, operator approves before anything is sent or spent)
and `life/SESSION.md` every session. Keep `life/state.json` live so the game shows what you're doing.

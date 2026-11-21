# Graph Report - claude-life  (2026-11-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 191 nodes · 386 edges · 13 communities (10 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d2e0486`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11

## God Nodes (most connected - your core abstractions)
1. `mat()` - 20 edges
2. `frame()` - 17 edges
3. `nodes()` - 13 edges
4. `obj_from_bm()` - 12 edges
5. `go()` - 11 edges
6. `sphere()` - 11 edges
7. `strawberry()` - 10 edges
8. `drawRoom()` - 9 edges
9. `add_bump()` - 9 edges
10. `cherry()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `apricot_whole()` --calls--> `peach_whole()`  [EXTRACTED]
  jogobella/source/fruit.py → jogobella/source/fruit.py  _Bridges community 4 → community 5_
- `cherry()` --calls--> `curve()`  [EXTRACTED]
  jogobella/source/fruit.py → jogobella/source/fruit.py  _Bridges community 4 → community 6_
- `obj_from_bm()` --calls--> `link()`  [EXTRACTED]
  jogobella/source/fruit.py → jogobella/source/fruit.py  _Bridges community 4 → community 9_
- `cherry()` --calls--> `add_bump()`  [EXTRACTED]
  jogobella/source/fruit.py → jogobella/source/fruit.py  _Bridges community 5 → community 6_
- `lime_rind()` --calls--> `add_bump()`  [EXTRACTED]
  jogobella/source/fruit.py → jogobella/source/fruit.py  _Bridges community 5 → community 7_

## Import Cycles
- None detected.

## Communities (13 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (37): buildSolid(), clamp01(), COVER, cover(), crop(), easeOutQuad(), ensureGL(), FACTORS (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (36): ago(), apply(), byWho(), confetti(), crewPose(), crewUpdate(), current(), drawChair() (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (19): fs, http, os, path, TYPES, buildId(), { execFile, spawn }, fs (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.17
Nodes (4): bottle(), font(), sheet(), trim()

### Community 4 - "Community 4"
Cohesion: 0.23
Nodes (7): apricot_whole(), curve(), frame_and_render(), group(), link(), rosemary(), taper_curve()

### Community 5 - "Community 5"
Cohesion: 0.36
Nodes (12): add_bump(), calyx(), leaf(), mat(), nodes(), peach_skin(), peach_whole(), raspberry() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (10): apply_rot(), apricot_half(), cherry(), f(), cherry_pair(), flesh_mat(), peach_half(), pit() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (9): apply_mods(), citrus_face_mat(), cut(), lime_half(), lime_rind(), lime_slice(), passion_half(), strawberry() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (7): background_color, display, icons, name, short_name, start_url, theme_color

### Community 9 - "Community 9"
Cohesion: 0.70
Nodes (5): obj_from_bm(), seeds_on(), watermelon_cube(), watermelon_face(), watermelon_wedge()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pit()` connect `Community 6` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09230769230769231 - nodes in this community are weakly interconnected._
- **Why does `cut()` connect `Community 7` to `Community 9`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11522048364153627 - nodes in this community are weakly interconnected._
- **Why does `mat()` connect `Community 5` to `Community 9`, `Community 4`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._
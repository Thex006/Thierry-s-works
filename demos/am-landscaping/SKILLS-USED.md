# Skills used: A & M Landscaping and Lawncare (2D)

Each skill was loaded with the Skill tool. What it changed on this site:

- **design-taste-frontend**: the whole build. Kit copied to `assets/`, gate armed (service), deal: hero split, cobalt-on-sand
  palette, Red Hat type, word-highlight moment in #story, close-word, dark band at #hardscapes. copy-lint 0 FAIL 0 WARN
  (rerun after the edits below). Layout checker clean at 1280 and 375; finish gate OPEN 4 after 3 rounds (areas has no
  picture, one gap, footer peek at 390).
- **landing-page-design** (elayadesign ai-design-skills): took the hyphens out of the copy ("Family-run" became "A family
  business", "clean-up" became "cleanup"); hover transitions moved off `ease` to the skill's base curve
  `cubic-bezier(.22,1,.36,1)` at 300 to 500 ms. Its tagline-reveal rule is met by the word-highlight story section. Not
  taken: its FAQ and font list (Geist/Manrope), because the taste kit's one-section-per-screen rule and dealt type win here.
- **figma-designer** (same pack): doesn't apply, no Figma file in this job.
- **impeccable**: mode Persuade; refinement, not redesign, so the dealt identity and the client's facts stay. Its launcher
  can't run in the worker (only node and git are allowed), so I applied its principles by hand: no invented claims, every
  fact from the client's own site.
- **typeui-minimal**: checked contrast (navy #062b8a on sand #e6dbc7 passes AA), one spacing scale from the kit, visible
  focus rings on the tabbable service rows. No change needed.
- **redesign-existing-projects**: audited against the client's 2017 site: real family story and service list kept,
  stock-template look replaced, skip link, form validation with inline errors, favicon, meta and alt text all present.
  Legal links and a 404 left out: a one-page demo, added if the client buys.
- **imagegen-frontend-web**: used for direction only (image-led hero, varied anchors: split hero, rows + photo, dark
  two-photo band, big type, form + photo). No images generated: the kit requires real photographs, so stand-ins come from
  Wikimedia Commons (credits.html).
- **brandkit**: no board generated. The client has a name and no logo, so the mark is the kit's arc and a plain wordmark;
  a full identity is an upsell, not part of a $50 demo.
- **playwright-cli**: the global CLI isn't allowed in the worker, so screenshots at 375 and 1280 ran through the kit's
  Chrome headless scripts (node) in the previous run.
- **writing-guidelines** (fetched the current rules): split the story's long sentence into four under 20 words; curly
  apostrophes (Angie’s, We’ll); sentence-case headings and no em dashes already held.
- **frontend-ui-engineering** (addyosmani agent-skills): semantic landmarks, labelled form fields with
  `aria-describedby` errors, keyboard-reachable rows, reduced-motion guard on hovers. No change needed.
- **graphify**: the session's codebase map was used to find the kit's modules; no rebuild (Python isn't allowed in the
  worker) and nothing in `graphify-out/` is committed.

3D version: next, in `demos/am-landscaping-3d`.

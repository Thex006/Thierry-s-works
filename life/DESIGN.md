# Design: learn from the best, build premium

## Before building any demo
1. Load the taste skill (`design-taste-frontend`). Always.
2. Spend 5 minutes on inspiration for the client's niche and mood:
   - **Prompt libraries:** motionsites.ai (free prompts for motion/2D/3D sections) and similar.
     Check each site's terms: use prompts as allowed, never pass off someone's paid prompt as ours.
   - **Galleries:** Awwwards, Godly, Land-book, Lapa Ninja, Dribbble (web), SiteInspire.
   - **Same-niche winners:** the best-looking sites of that trade in big cities.
3. Note 2–3 patterns to borrow (layout, motion, typography, hero idea). Borrow patterns, never copy
   a site, its text or its images.

## 2D and 3D
- **2D motion** (scroll reveals, animated SVG, Lottie, subtle parallax): good for most clients. Cheap to build, feels premium.
- **3D** (Three.js, Spline embeds, 3D hero objects): an add-on for clients who can pay for it or whose
  product suits it (restaurants, real estate, products). Keep it fast: test on a mid-range phone,
  lazy-load it, and keep a static fallback.
- Guard checks every demo for speed (loads fast on mobile), accessibility (contrast, tap targets,
  reduced-motion setting respected) and no console errors.

## Keep a swipe file
Save what works in `life/design-notes.md`: which patterns clients liked, which demos got replies.
Turn the best ones into reusable niche templates (and sellable templates, bet 3).

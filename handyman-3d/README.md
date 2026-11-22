# Handyman in Columbus, 3D concept

Premium 3D version of the Classic Columbus handyman site. Same business facts and copy, new design language ("knolled workbench"): light workshop paper, graphite ink, one hi-vis accent, and a scroll story where 13 photo-scanned real tools tumble in the air, land knolled on a plywood bench, and get picked up one per service.

- Stack: Next.js (static export), React Three Fiber, drei, Tailwind v4, Lenis.
- 3D: Poly Haven CC0 photo-scanned tools (glTF, WebP textures, meshopt). Desktop loads `public/models/hi` (2K textures on the five hero tools), phones load `public/models/lo` (1K).
- Run locally: `npm install && npm run build && npm start` then open http://localhost:3008 (LAN address is printed for phones).
- Dev: `npm run dev`.

Concept demo, not the live site of the business. Credits at /credits.

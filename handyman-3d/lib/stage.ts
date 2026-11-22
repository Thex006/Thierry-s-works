import { LAYOUT } from "./tools";
import { services } from "./content";

/** Shared mutable state, written by the DOM scroll loop and read inside the WebGL frame loop. */
export const stage = {
  progress: 0, // 0..1 through the pinned 3D stage
  mouseX: 0,
  mouseY: 0,
  mobile: false,
  ready: false,
};

export type Shot = {
  key: string;
  pos: [number, number, number];
  target: [number, number, number];
  /** Shift of the picture in fractions of the viewport (desktop x, mobile y). */
  shiftX: number;
  shiftY: number;
  knoll: number;
  focus?: string;
  fov: number;
};

/** How high a tool is lifted off the bench when the camera picks it up. */
export const LIFT = 0.34;

function focusShot(key: string, tool: string): Shot {
  const s = LAYOUT[tool];
  const k = Math.max(0.8, Math.max(s.l, s.w) * 2.45);
  const t: [number, number, number] = [s.x, LIFT, s.z];
  return {
    key,
    target: t,
    pos: [t[0] + 0.05 * k, t[1] + 0.2 * k, t[2] + 0.98 * k],
    shiftX: -0.13,
    shiftY: 0.13,
    knoll: 1,
    focus: tool,
    fov: 30,
  };
}

export const SHOTS: Shot[] = [
  { key: "hero", pos: [0, 0.62, 2.55], target: [0, 0.4, 0], shiftX: -0.2, shiftY: 0.22, knoll: 0, fov: 34 },
  { key: "knoll", pos: [0, 2.4, 0.3], target: [0, 0, -0.02], shiftX: -0.17, shiftY: 0.14, knoll: 1, fov: 34 },
  ...services.map((s) => focusShot(s.id, s.tool)),
  { key: "final", pos: [1.05, 1.05, 1.55], target: [0.02, 0, 0.02], shiftX: -0.16, shiftY: 0.12, knoll: 1, fov: 30 },
];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Returns the two shots we sit between and the eased blend, with a hold at each shot. */
export function shotBlend(p: number) {
  const n = SHOTS.length - 1;
  const t = clamp01(p) * n;
  const i = Math.min(n - 1, Math.floor(t));
  const f = t - i;
  const g = easeInOut(clamp01((f - 0.22) / 0.56));
  return { a: SHOTS[i], b: SHOTS[i + 1], g, t };
}

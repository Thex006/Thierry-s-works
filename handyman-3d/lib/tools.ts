// Photo-scanned tools (Poly Haven, CC0). Sizes are the real bounding boxes in metres,
// measured from the source models, so the knolled layout is computed before anything loads.

export type ToolDef = {
  id: string;
  /** "flat": lay the tool on its thinnest side. "upright": keep it standing on its base. */
  pose: "flat" | "upright";
  /** Turn the tool 90 degrees so it lies across the board instead of along it. */
  across?: boolean;
  /** Flip it over onto its other face. */
  flip?: boolean;
  /** Extra spin around the vertical axis, in radians, for upright tools. */
  yaw?: number;
  size: [number, number, number];
};

export const TOOLS: ToolDef[] = [
  { id: "pipe_wrench", pose: "flat", size: [0.084, 0.405, 0.034] },
  { id: "hand_plane_no4", pose: "upright", yaw: Math.PI / 2, size: [0.331, 0.198, 0.084] },
  { id: "trowel_01", pose: "upright", size: [0.099, 0.103, 0.347] },
  { id: "combination_wrench", pose: "flat", size: [0.057, 0.022, 0.337] },
  { id: "wooden_hammer_01", pose: "flat", size: [0.112, 0.279, 0.023] },
  { id: "flathead_screwdriver", pose: "flat", size: [0.03, 0.261, 0.03] },
  { id: "adjustable_wrench", pose: "flat", size: [0.068, 0.254, 0.031] },
  { id: "Drill_01", pose: "flat", size: [0.183, 0.185, 0.052] },
  { id: "measuring_tape_01", pose: "flat", size: [0.041, 0.073, 0.169] },
  { id: "tongue_groove_pliers", pose: "flat", size: [0.063, 0.014, 0.244] },
  { id: "screwdriver", pose: "flat", size: [0.027, 0.209, 0.027] },
  { id: "pliers", pose: "flat", size: [0.055, 0.18, 0.018] },
  { id: "handsaw_wood", pose: "flat", across: true, size: [0.041, 0.167, 0.633] },
];

export const ROWS: string[][] = [
  ["pipe_wrench", "hand_plane_no4", "trowel_01", "combination_wrench", "wooden_hammer_01", "flathead_screwdriver", "adjustable_wrench"],
  ["Drill_01", "measuring_tape_01", "tongue_groove_pliers", "screwdriver", "pliers"],
  ["handsaw_wood"],
];

export const GAP = 0.05;
export const ROW_GAP = 0.06;

/** Footprint on the board: [width along x, length along z]. */
export function footprint(t: ToolDef): [number, number] {
  const s = [...t.size].sort((a, b) => a - b);
  let w: number, l: number;
  if (t.pose === "upright") {
    // footprint is x/z of the natural pose, possibly turned
    const [x, , z] = t.size;
    const turned = t.yaw && Math.abs(Math.sin(t.yaw)) > 0.5;
    [w, l] = turned ? [z, x] : [x, z];
  } else {
    w = s[1];
    l = s[2];
  }
  return t.across ? [l, w] : [w, l];
}

export type Slot = { x: number; z: number; w: number; l: number };

/** Knolling: tools parallel, evenly spaced, rows centred. */
export function knollLayout(): Record<string, Slot> {
  const byId = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
  const rows = ROWS.map((ids) => {
    const fps = ids.map((id) => footprint(byId[id]));
    const width = fps.reduce((a, f) => a + f[0], 0) + GAP * (ids.length - 1);
    const depth = Math.max(...fps.map((f) => f[1]));
    return { ids, fps, width, depth };
  });
  const total = rows.reduce((a, r) => a + r.depth, 0) + ROW_GAP * (rows.length - 1);
  const out: Record<string, Slot> = {};
  let z = -total / 2;
  for (const r of rows) {
    let x = -r.width / 2;
    r.ids.forEach((id, i) => {
      const [w, l] = r.fps[i];
      out[id] = { x: x + w / 2, z: z + r.depth / 2, w, l };
      x += w + GAP;
    });
    z += r.depth + ROW_GAP;
  }
  return out;
}

export const LAYOUT = knollLayout();

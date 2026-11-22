"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LAYOUT, TOOLS, type ToolDef } from "@/lib/tools";
import { LIFT, clamp01, shotBlend, stage } from "@/lib/stage";

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Rotation that lays a tool on its thinnest side with its long edge along +z. */
function restQuat(t: ToolDef) {
  const q = new THREE.Quaternion();
  if (t.pose === "upright") {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.yaw ?? 0);
  } else {
    const idx = [0, 1, 2].sort((a, b) => t.size[a] - t.size[b]);
    const axis = (i: number) => new THREE.Vector3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0);
    const thin = axis(idx[0]);
    const mid = axis(idx[1]);
    const long = axis(idx[2]);
    const m = new THREE.Matrix4().set(
      mid.x, mid.y, mid.z, 0,
      thin.x, thin.y, thin.z, 0,
      long.x, long.y, long.z, 0,
      0, 0, 0, 1,
    );
    if (m.determinant() < 0) {
      m.set(-mid.x, -mid.y, -mid.z, 0, thin.x, thin.y, thin.z, 0, long.x, long.y, long.z, 0, 0, 0, 0, 1);
    }
    q.setFromRotationMatrix(m);
    if (t.flip) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));
  }
  if (t.across) q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2));
  return q;
}

const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

function Tool({ def, index, quality }: { def: ToolDef; index: number; quality: "hi" | "lo" }) {
  const { scene } = useGLTF(`/models/${quality}/${def.id}.glb`);
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const halfH = useRef(0.02);

  const model = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.envMapIntensity = 1;
          if (mat.map) mat.map.anisotropy = 8;
        }
      }
    });
    return c;
  }, [scene]);

  const rest = useMemo(() => restQuat(def), [def]);

  // Cloud pose for the hero: scattered in front of the camera, tumbling slowly.
  const cloud = useMemo(() => {
    const r = seeded(index + 3);
    const cols = 5;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = (col - (cols - 1) / 2) * 0.27 + (r() - 0.5) * 0.1;
    const y = 0.74 - row * 0.25 + (r() - 0.5) * 0.08;
    const z = (r() - 0.5) * 0.5;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6.28, r() * 6.28, r() * 6.28));
    const spin = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
    return { pos: new THREE.Vector3(x, y, z), q, spin, speed: 0.12 + r() * 0.16, phase: r() * 6.28 };
  }, [index]);

  useLayoutEffect(() => {
    if (!inner.current) return;
    inner.current.quaternion.copy(rest);
    inner.current.position.set(0, 0, 0);
    inner.current.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner.current);
    const c = box.getCenter(new THREE.Vector3());
    inner.current.position.sub(c);
    halfH.current = (box.max.y - box.min.y) / 2;
  }, [rest, model]);

  const slot = LAYOUT[def.id];
  const delay = (index / TOOLS.length) * 0.45;

  useFrame((state) => {
    const o = outer.current;
    if (!o) return;
    const time = state.clock.elapsedTime;
    const { a, b, g } = shotBlend(stage.progress);
    const knoll = a.knoll + (b.knoll - a.knoll) * g;
    const focus = (a.focus === def.id ? 1 - g : 0) + (b.focus === def.id ? g : 0);

    // Staggered landing: each tool starts its flight a little after the previous one.
    const k = clamp01((knoll * 1.45 - delay) / 1);
    const ke = k * k * (3 - 2 * k);

    // Position: cloud -> knolled slot, with a small arc.
    const bob = Math.sin(time * 0.8 + cloud.phase) * 0.012 * (1 - ke);
    const kx = slot.x;
    const ky = halfH.current + 0.0005;
    const kz = slot.z;
    o.position.set(
      cloud.pos.x + (kx - cloud.pos.x) * ke,
      cloud.pos.y + bob + (ky - cloud.pos.y) * ke + Math.sin(ke * Math.PI) * 0.12,
      cloud.pos.z + (kz - cloud.pos.z) * ke,
    );

    // Rotation: tumbling cloud orientation -> flat rest (identity on the outer group).
    tmpQ.setFromAxisAngle(cloud.spin, time * cloud.speed);
    tmpQ.multiply(cloud.q);
    tmpQ2.identity();
    o.quaternion.copy(tmpQ).slerp(tmpQ2, ke);

    // Focus: pick the tool up off the board and tilt it toward the lens.
    if (focus > 0.001) {
      const f = focus * focus * (3 - 2 * focus);
      o.position.y += LIFT * f;
      // turn the long edge across the screen, then tip the face toward the lens
      tmpQ.setFromAxisAngle(UP, (-Math.PI / 2 + Math.sin(time * 0.45) * 0.18) * f);
      o.quaternion.premultiply(tmpQ);
      tmpE.set((def.pose === "upright" ? 0.38 : 0.9) * f, 0, Math.sin(time * 0.6) * 0.05 * f);
      tmpQ.setFromEuler(tmpE);
      o.quaternion.premultiply(tmpQ);
    }
  });

  return (
    <group ref={outer}>
      <group ref={inner}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export default function Tools({ quality }: { quality: "hi" | "lo" }) {
  return (
    <group>
      {TOOLS.map((t, i) => (
        <Tool key={t.id} def={t} index={i} quality={quality} />
      ))}
    </group>
  );
}

export function preloadTools(quality: "hi" | "lo") {
  TOOLS.forEach((t) => useGLTF.preload(`/models/${quality}/${t.id}.glb`));
}

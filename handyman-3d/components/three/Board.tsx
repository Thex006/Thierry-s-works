"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export const BOARD = { w: 1.3, d: 1.12, t: 0.018 };

/** Plywood edge: alternating birch veneers, drawn once to a canvas. */
function useEdgeTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 64;
    const g = c.getContext("2d")!;
    const plies = 7;
    for (let i = 0; i < plies; i++) {
      const y0 = (i / plies) * 64;
      g.fillStyle = i % 2 === 0 ? "#d9b98a" : "#c9a272";
      g.fillRect(0, y0, 1024, 64 / plies);
      g.fillStyle = "rgba(60,40,20,0.35)";
      g.fillRect(0, y0, 1024, 0.8);
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(80,55,30,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * 1024, Math.random() * 64, 1 + Math.random() * 6, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}

export default function Board({ quality }: { quality: "hi" | "lo" }) {
  const [map, normalMap, roughnessMap] = useTexture([
    quality === "hi" ? "/tex/plywood_diff.webp" : "/tex/plywood_diff_lo.webp",
    "/tex/plywood_nor.webp",
    "/tex/plywood_rough.webp",
  ]);
  const edge = useEdgeTexture();

  const mats = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    [map, normalMap, roughnessMap].forEach((t) => {
      t.anisotropy = 16;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1.15, 1.15 * (BOARD.d / BOARD.w));
    });
    const top = new THREE.MeshStandardMaterial({
      map,
      normalMap,
      roughnessMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 1,
      color: new THREE.Color("#fffaf2"),
      envMapIntensity: 0.55,
    });
    const side = new THREE.MeshStandardMaterial({ map: edge ?? undefined, roughness: 0.85, envMapIntensity: 0.4 });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    return [side, side, top, side, side, side];
  }, [map, normalMap, roughnessMap, edge]);

  return (
    <group>
      <mesh position={[0, -BOARD.t / 2, 0]} receiveShadow castShadow material={mats}>
        <boxGeometry args={[BOARD.w, BOARD.t, BOARD.d]} />
      </mesh>
      {/* Infinite floor that only shows shadow, so the page colour stays flat. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -BOARD.t - 0.0005, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
    </group>
  );
}

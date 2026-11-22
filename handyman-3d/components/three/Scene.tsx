"use client";

import { AdaptiveDpr, Environment, PerformanceMonitor, SoftShadows, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import Board from "./Board";
import Tools, { preloadTools } from "./Tools";
import { shotBlend, stage } from "@/lib/stage";

const BG = "#e9e6df";

const vA = new THREE.Vector3();
const vB = new THREE.Vector3();
const tA = new THREE.Vector3();
const tB = new THREE.Vector3();
const look = new THREE.Vector3();
const off = new THREE.Vector3();

function CameraRig() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const mx = useMemo(() => ({ x: 0, y: 0, shift: 0 }), []);

  useFrame((_, dt) => {
    const { a, b, g } = shotBlend(stage.progress);
    const aspect = size.width / size.height;
    const narrow = aspect < 1;
    vA.fromArray(a.pos);
    vB.fromArray(b.pos);
    tA.fromArray(a.target);
    tB.fromArray(b.target);
    const target = tA.lerp(tB, g);
    const pos = vA.lerp(vB, g);

    // Portrait screens need the camera further back to keep the whole board in frame.
    const pull = narrow ? 1 + (1 / aspect - 1) * 0.9 : aspect < 1.45 ? 1.12 : 1;
    off.copy(pos).sub(target).multiplyScalar(pull);

    // Soft mouse parallax.
    const k = 1 - Math.exp(-dt * 3);
    mx.x += (stage.mouseX - mx.x) * k;
    mx.y += (stage.mouseY - mx.y) * k;
    const par = narrow ? 0 : 0.035;
    cam.position.copy(target).add(off);
    cam.position.x += mx.x * par;
    cam.position.y += mx.y * par * 0.6;
    look.copy(target);
    cam.lookAt(look);

    cam.fov = a.fov + (b.fov - a.fov) * g;

    // Shift the frame so the subject sits beside the copy instead of under it.
    const shift = narrow ? a.shiftY + (b.shiftY - a.shiftY) * g : a.shiftX + (b.shiftX - a.shiftX) * g;
    mx.shift = shift;
    if (narrow) cam.setViewOffset(size.width, size.height, 0, shift * size.height, size.width, size.height);
    else cam.setViewOffset(size.width, size.height, shift * size.width, 0, size.width, size.height);
    cam.updateProjectionMatrix();
  });
  return null;
}

function KeyLight() {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight("#fff3e3", 2.6);
    l.position.set(-1.1, 2.4, 0.9);
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    l.shadow.bias = -0.00025;
    l.shadow.normalBias = 0.015;
    const c = l.shadow.camera as THREE.OrthographicCamera;
    c.left = -1.1;
    c.right = 1.1;
    c.top = 1.1;
    c.bottom = -1.1;
    c.near = 0.5;
    c.far = 5;
    return l;
  }, []);
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
}

function LoadReporter() {
  const { progress, active } = useProgress();
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("stage-progress", { detail: { progress, active } }));
  }, [progress, active]);
  return null;
}

export default function Scene({ active = true }: { active?: boolean }) {
  const [quality] = useState<"hi" | "lo">(() =>
    typeof window !== "undefined" && (window.innerWidth < 820 || (navigator.hardwareConcurrency ?? 8) < 4) ? "lo" : "hi",
  );
  const [dpr, setDpr] = useState(2);
  useEffect(() => preloadTools(quality), [quality]);

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, dpr]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 0.5, 1.7], fov: 34, near: 0.02, far: 20 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={[BG]} />
      <PerformanceMonitor onDecline={() => setDpr(1.25)} onIncline={() => setDpr(2)} />
      <AdaptiveDpr pixelated={false} />
      <SoftShadows size={18} samples={12} focus={0.6} />
      <hemisphereLight args={["#ffffff", "#d9cbb5", 0.35]} />
      <KeyLight />
      <CameraRig />
      <LoadReporter />
      <Suspense fallback={null}>
        <Environment files="/env/studio.hdr" environmentIntensity={0.75} />
        <Board quality={quality} />
        <Tools quality={quality} />
      </Suspense>
    </Canvas>
  );
}

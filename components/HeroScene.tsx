"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import { aiModules } from "@/lib/module-data";
import {
  createHexGeometrySet,
  disposeHexGeometrySet,
} from "@/lib/scene-utils";
import { AmbientParticles } from "@/components/AmbientParticles";
import { CircuitBoard } from "@/components/CircuitBoard";
import { HexButton3D } from "@/components/HexButton3D";
import { HologramColumns } from "@/components/HologramColumns";
import { TyndallBeams } from "@/components/TyndallBeams";

interface HeroSceneProps {
  activeId: string;
  hoveredId: string | null;
  isMobile: boolean;
  onHoverChange: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function HeroScene({
  activeId,
  hoveredId,
  isMobile,
  onHoverChange,
  onSelect,
}: HeroSceneProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Canvas
      shadows
      dpr={isMobile ? [1.1, 1.6] : [1.25, 2]}
      camera={{
        position: [0.18, 7.25, 7.45],
        fov: isMobile ? 43 : 32,
        near: 0.1,
        far: 50,
      }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.14;
        gl.setClearColor("#020511");
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFShadowMap;
        scene.fog = new THREE.Fog("#020511", 9, 19);
      }}
    >
      <SceneContent
        activeId={activeId}
        hoveredId={hoveredId}
        isMobile={isMobile}
        onHoverChange={onHoverChange}
        onSelect={onSelect}
        reducedMotion={Boolean(shouldReduceMotion)}
      />
    </Canvas>
  );
}

interface SceneContentProps {
  activeId: string;
  hoveredId: string | null;
  isMobile: boolean;
  onHoverChange: (id: string | null) => void;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
}

function SceneContent({
  activeId,
  hoveredId,
  isMobile,
  onHoverChange,
  onSelect,
  reducedMotion,
}: SceneContentProps) {
  const { size } = useThree();
  const activeModule =
    aiModules.find((module) => module.id === activeId) ?? aiModules[0];
  const aspect = size.width / Math.max(size.height, 1);
  const boardYaw = isMobile ? -0.03 : -0.045;
  const baseBoardScale = isMobile ? 0.62 : aspect < 1.5 ? 0.76 : 0.82;
  const boardScale = baseBoardScale * 1.2;
  const boardPosition =
    isMobile || aspect < 1.5
      ? ([0.04, -0.24, -0.42] as const)
      : ([0.08, -0.26, -0.2] as const);

  const geometrySet = useMemo(() => createHexGeometrySet(), []);

  useEffect(() => {
    return () => disposeHexGeometrySet(geometrySet);
  }, [geometrySet]);

  return (
    <>
      <color attach="background" args={["#020511"]} />
      <ambientLight intensity={0.36} color="#3f76d7" />
      <hemisphereLight args={["#d6f7ff", "#07101f", 0.62]} />
      <directionalLight
        castShadow
        position={[3.8, 8.2, 5.6]}
        intensity={2.45}
        color="#dce9ff"
        shadow-mapSize-width={isMobile ? 1024 : 2048}
        shadow-mapSize-height={isMobile ? 1024 : 2048}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <spotLight
        position={[-4.6, 5.2, 3.8]}
        angle={0.44}
        penumbra={0.9}
        intensity={26}
        color="#4fe6ff"
      />
      <spotLight
        position={[7.0, 5.4, -0.2]}
        angle={0.42}
        penumbra={0.9}
        intensity={15}
        color="#9f82ff"
      />
      <spotLight
        position={[0.5, 1.6, 3.3]}
        angle={0.56}
        penumbra={1}
        intensity={26}
        color="#5ac8ff"
      />
      <Environment resolution={64}>
        <Lightformer
          form="ring"
          color="#264eff"
          intensity={1.8}
          scale={12}
          position={[0, 7, -2]}
        />
        <Lightformer
          form="rect"
          color="#8de7ff"
          intensity={3.4}
          scale={[12, 1.2, 1]}
          position={[0.4, 2.2, 7.0]}
        />
        <Lightformer
          form="rect"
          color="#8c68ff"
          intensity={1.8}
          scale={[7, 1.8, 1]}
          position={[-6.6, 2.4, 0.4]}
          rotation={[0, Math.PI / 3, 0]}
        />
        <Lightformer
          form="rect"
          color="#74cfff"
          intensity={1.4}
          scale={[8, 1.2, 1]}
          position={[8.4, 2.5, -0.8]}
          rotation={[0, -Math.PI / 3.2, 0]}
        />
      </Environment>

      <CameraRig
        activePosition={activeModule.position}
        isHoveringModule={hoveredId !== null}
        reducedMotion={reducedMotion}
        isMobile={isMobile}
        aspect={aspect}
      />
      <FollowLight activePosition={activeModule.position} accent={activeModule.accent} />

      <group
        position={boardPosition}
        rotation={[0, boardYaw, 0]}
        scale={[boardScale, boardScale, boardScale]}
        frustumCulled={false}
      >
        <CircuitBoard isMobile={isMobile} />
        <TyndallBeams isMobile={isMobile} />
        <HologramColumns isMobile={isMobile} />
        <AmbientParticles isMobile={isMobile} />
        <group position={[0, 0.52, 0]}>
          {aiModules.map((module, index) => (
            <HexButton3D
              key={module.id}
              module={module}
              geometrySet={geometrySet}
              isActive={module.id === activeId}
              isMobile={isMobile}
              boardYaw={boardYaw}
              index={index}
              reducedMotion={reducedMotion}
              onHoverChange={onHoverChange}
              onSelect={onSelect}
            />
          ))}
        </group>
      </group>
    </>
  );
}

function CameraRig({
  activePosition,
  isHoveringModule,
  reducedMotion,
  isMobile,
  aspect,
}: {
  activePosition: [number, number, number];
  isHoveringModule: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  aspect: number;
}) {
  const { camera, pointer } = useThree();
  const target = useRef(new THREE.Vector3());
  const lookAtTarget = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  const hoverBlend = useRef(0);
  const initializedRef = useRef(false);

  useFrame(({ clock }, delta) => {
    hoverBlend.current = THREE.MathUtils.damp(
      hoverBlend.current,
      isHoveringModule ? 1 : 0,
      reducedMotion ? 6 : 4.8,
      delta,
    );

    const driftX = reducedMotion ? 0 : Math.sin(clock.getElapsedTime() * 0.18) * 0.16;
    const driftY = reducedMotion ? 0 : Math.cos(clock.getElapsedTime() * 0.24) * 0.12;
    const pointerX = pointer.x * (reducedMotion ? 0.03 : isMobile ? 0.04 : 0.05);
    const pointerY = pointer.y * (reducedMotion ? 0.03 : isMobile ? 0.04 : 0.05);
    const baseZ = isMobile ? 10.15 : aspect < 1.5 ? 10.7 : 11.35;
    const baseY = isMobile ? 9.25 : 9.9;
    const focusZoom = Math.max(0, 1 - Math.min(Math.abs(activePosition[2]) / 8, 1)) * 0.28;
    const hoverFocus = hoverBlend.current;
    const hoverLift = hoverFocus * 0.18;
    const hoverSkewX = activePosition[0] * 0.012 * hoverFocus;
    const hoverSkewY = (0.05 + activePosition[1] * 0.05) * hoverFocus;

    target.current.set(
      0.03 + activePosition[0] * 0.014 + pointerX + driftX + hoverSkewX,
      baseY + activePosition[1] * 0.08 - pointerY + driftY + hoverLift + hoverSkewY,
      baseZ + activePosition[2] * 0.028 - focusZoom - Math.abs(pointer.x) * 0.008,
    );

    lookAtTarget.current.set(
      0.02 + activePosition[0] * (0.016 + hoverFocus * 0.006),
      0.28 + activePosition[1] * (0.05 + hoverFocus * 0.02) + hoverFocus * 0.03,
      -0.98 + activePosition[2] * (0.045 + hoverFocus * 0.01),
    );

    target.current.lerp(lookAtTarget.current, hoverFocus * 0.2);

    if (!initializedRef.current) {
      currentLookAt.current.copy(lookAtTarget.current);
      initializedRef.current = true;
    } else {
      currentLookAt.current.lerp(lookAtTarget.current, 0.08);
    }

    camera.position.lerp(target.current, 0.05);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

function FollowLight({
  activePosition,
  accent,
}: {
  activePosition: [number, number, number];
  accent: string;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const target = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!lightRef.current) {
      return;
    }

    target.current.set(activePosition[0], activePosition[1] + 1.65, activePosition[2] - 0.4);
    lightRef.current.position.lerp(target.current, 0.08);
  });

  return (
    <pointLight
      ref={lightRef}
      color={accent}
      intensity={7.5}
      distance={8.5}
      decay={2}
      position={[0.35, 1.5, -1.4]}
    />
  );
}

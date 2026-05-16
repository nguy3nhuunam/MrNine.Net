"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  hologramBeamFragmentShader,
  hologramBeamVertexShader,
} from "@/shaders/hologram-beam";

interface TyndallBeamsProps {
  isMobile: boolean;
}

const TyndallSourcePoints: Array<{
  position: [number, number, number];
  color: string;
  scale: number;
  height: number;
  rotation: number;
}> = [
  { position: [-4.05, -0.02, -3.0], color: "#67d7ff", scale: 0.7, height: 2.6, rotation: 0.05 },
  { position: [-1.35, -0.02, -3.0], color: "#76c8ff", scale: 0.72, height: 2.8, rotation: -0.02 },
  { position: [1.35, -0.02, -3.0], color: "#9d84ff", scale: 0.72, height: 2.8, rotation: 0.04 },
  { position: [4.05, -0.02, -3.0], color: "#71d7ff", scale: 0.68, height: 2.6, rotation: -0.03 },
  { position: [-5.1, -0.02, -0.3], color: "#7bd4ff", scale: 0.66, height: 2.2, rotation: 0.08 },
  { position: [-2.7, -0.02, -0.3], color: "#6fe2ff", scale: 0.74, height: 2.4, rotation: -0.04 },
  { position: [0.0, -0.02, -0.22], color: "#6ee7ff", scale: 0.86, height: 2.8, rotation: 0.02 },
  { position: [2.7, -0.02, -0.3], color: "#82c9ff", scale: 0.72, height: 2.4, rotation: -0.05 },
  { position: [5.1, -0.02, -0.3], color: "#88ffa2", scale: 0.72, height: 2.3, rotation: 0.08 },
  { position: [-4.05, -0.02, 1.25], color: "#9cb3ff", scale: 0.64, height: 2.1, rotation: -0.06 },
  { position: [-1.35, -0.02, 1.25], color: "#ff84db", scale: 0.64, height: 2.1, rotation: 0.02 },
  { position: [1.35, -0.02, 1.25], color: "#9fd2ff", scale: 0.68, height: 2.15, rotation: -0.04 },
  { position: [4.05, -0.02, 1.25], color: "#7ee7ff", scale: 0.68, height: 2.1, rotation: 0.06 },
];

export function TyndallBeams({ isMobile }: TyndallBeamsProps) {
  return (
    <group position={[0, 0.04, 0]}>
      {TyndallSourcePoints.map((beam, index) => (
        <TyndallBeam
          key={`${beam.position.join("-")}-${beam.color}`}
          color={beam.color}
          height={beam.height}
          position={beam.position}
          rotation={beam.rotation}
          scale={isMobile ? beam.scale * 0.8 : beam.scale}
          seed={index}
        />
      ))}
    </group>
  );
}

interface TyndallBeamProps {
  color: string;
  height: number;
  position: [number, number, number];
  rotation: number;
  scale: number;
  seed: number;
}

function TyndallBeam({
  color,
  height,
  position,
  rotation,
  scale,
  seed,
}: TyndallBeamProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const auraRef = useRef<THREE.MeshBasicMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color],
  );

  useEffect(() => {
    const material = materialRef.current;
    return () => material?.dispose();
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t + seed * 0.23;
    }

    if (groupRef.current) {
      groupRef.current.position.y =
        position[1] + Math.sin(t * 0.7 + seed * 0.35) * 0.035;
    }

    if (auraRef.current) {
      auraRef.current.opacity = 0.12 + Math.sin(t * 1.2 + seed) * 0.025;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, height * 0.5, 0]} scale={[scale * 0.72, height * 0.82, scale]}>
        <planeGeometry args={[0.42, 1]} />
        <shaderMaterial
          ref={materialRef}
          attach="material"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          vertexShader={hologramBeamVertexShader}
          fragmentShader={hologramBeamFragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[scale * 1.35, scale * 0.9, 1]}>
        <planeGeometry args={[0.52, 0.36]} />
        <meshBasicMaterial
          ref={auraRef}
          color={color}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        color={color}
        intensity={0.85}
        distance={2.1}
        decay={2}
        position={[0, 0.16, 0]}
      />
    </group>
  );
}

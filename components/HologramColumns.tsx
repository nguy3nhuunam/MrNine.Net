"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  hologramBeamFragmentShader,
  hologramBeamVertexShader,
} from "@/shaders/hologram-beam";

interface HologramColumnsProps {
  isMobile: boolean;
}

const BEAMS = [
  { position: [-5.4, 2.7, -4.4], color: "#79e3ff", scale: 0.82, rotation: 0.12 },
  { position: [-1.4, 2.9, -4.8], color: "#8994ff", scale: 0.74, rotation: -0.08 },
  { position: [2.2, 3.1, -4.2], color: "#9f80ff", scale: 0.94, rotation: 0.1 },
  { position: [5.5, 2.8, -3.9], color: "#5fd8ff", scale: 0.88, rotation: -0.14 },
];

export function HologramColumns({ isMobile }: HologramColumnsProps) {
  return (
    <group position={[0, 0, 0]}>
      {BEAMS.map((beam) => (
        <HologramColumn
          key={`${beam.position.join("-")}-${beam.color}`}
          color={beam.color}
          position={beam.position as [number, number, number]}
          rotation={beam.rotation}
          scale={isMobile ? beam.scale * 0.75 : beam.scale}
        />
      ))}
    </group>
  );
}

interface HologramColumnProps {
  color: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
}

function HologramColumn({
  color,
  position,
  rotation,
  scale,
}: HologramColumnProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
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
    if (!materialRef.current) {
      return;
    }

    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <group position={position}>
      <mesh rotation={[0, rotation, 0]} scale={[scale, 4.6, scale]}>
        <planeGeometry args={[0.9, 1]} />
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
      <pointLight
        color={color}
        intensity={1.6}
        distance={4}
        decay={2}
        position={[0, 0.6, 0]}
      />
    </group>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AmbientParticlesProps {
  isMobile: boolean;
}

export function AmbientParticles({ isMobile }: AmbientParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = isMobile ? 110 : 220;

  const { positions, colors } = useMemo(() => {
    const positionBuffer = new Float32Array(count * 3);
    const colorBuffer = new Float32Array(count * 3);
    const palette = ["#72d9ff", "#7d7cff", "#ff78d2", "#cde2ff"];

    for (let index = 0; index < count; index += 1) {
      const stride = index * 3;
      const radius = 4 + pseudoRandom(index * 1.17 + 2.4) * 7.5;
      const angle = pseudoRandom(index * 2.11 + 0.8) * Math.PI * 2;
      const height = pseudoRandom(index * 0.87 + 4.6) * 4.8 + 0.2;

      positionBuffer[stride] = Math.cos(angle) * radius;
      positionBuffer[stride + 1] = height;
      positionBuffer[stride + 2] = Math.sin(angle) * radius - 2.4;

      const color = new THREE.Color(palette[index % palette.length]);
      colorBuffer[stride] = color.r;
      colorBuffer[stride + 1] = color.g;
      colorBuffer[stride + 2] = color.b;
    }

    return {
      positions: positionBuffer,
      colors: colorBuffer,
    };
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) {
      return;
    }

    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.025;
    pointsRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.35) * 0.08;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isMobile ? 0.045 : 0.06}
        transparent
        opacity={0.95}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453123;
  return value - Math.floor(value);
}

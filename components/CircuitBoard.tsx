"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getCircuitTextureSet } from "@/lib/scene-utils";

interface CircuitBoardProps {
  isMobile: boolean;
}

export function CircuitBoard({ isMobile }: CircuitBoardProps) {
  const glowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const underglowRef = useRef<THREE.MeshBasicMaterial>(null);
  const textures = useMemo(() => getCircuitTextureSet(), []);

  useFrame(({ clock }) => {
    if (!glowMaterialRef.current) {
      return;
    }

    glowMaterialRef.current.opacity =
      (isMobile ? 0.9 : 1) + Math.sin(clock.getElapsedTime() * 1.5) * 0.035;

    if (underglowRef.current) {
      underglowRef.current.opacity =
        (isMobile ? 0.26 : 0.32) + Math.sin(clock.getElapsedTime() * 1.1) * 0.025;
    }
  });

  return (
    <group>
      <mesh
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        frustumCulled={false}
      >
        <planeGeometry args={[31, 23]} />
        <meshBasicMaterial
          ref={underglowRef}
          map={textures.glow}
          transparent
          opacity={isMobile ? 0.26 : 0.32}
          color="#58dfff"
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={[0, -0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        frustumCulled={false}
      >
        <planeGeometry args={[28, 20]} />
        <meshStandardMaterial
          color="#01040d"
          emissive="#07152d"
          emissiveIntensity={0.54}
          roughness={0.2}
          metalness={0.96}
        />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[28, 20]} />
        <meshBasicMaterial
          map={textures.base}
          transparent
          opacity={0.99}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
        <planeGeometry args={[28, 20]} />
        <meshBasicMaterial
          ref={glowMaterialRef}
          map={textures.glow}
          transparent
          opacity={isMobile ? 0.88 : 0.98}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

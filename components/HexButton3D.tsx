"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html, useCursor } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { gsap } from "gsap";
import * as THREE from "three";
import type { ModuleConfig } from "@/lib/module-data";
import {
  createButtonLabelTexture,
  getLedGradientTexture,
  getRadialGlowTexture,
  type HexGeometrySet,
} from "@/lib/scene-utils";

interface HexButton3DProps {
  module: ModuleConfig;
  geometrySet: HexGeometrySet;
  isActive: boolean;
  isMobile: boolean;
  boardYaw: number;
  index: number;
  reducedMotion: boolean;
  onHoverChange: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export function HexButton3D({
  module,
  geometrySet,
  isActive,
  isMobile,
  boardYaw,
  index,
  reducedMotion,
  onHoverChange,
  onSelect,
}: HexButton3DProps) {
  const yaw = Math.PI / 6;
  const groupRef = useRef<THREE.Group>(null);
  const ledMeshRef = useRef<THREE.Mesh>(null);
  const borderMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const accentBorderMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const rippleMaterialRef = useRef<THREE.LineBasicMaterial>(null);
  const ledMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const labelMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const labelGlowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const introPlayedRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const ambientPulseSeed = useMemo(() => index * 0.73 + module.position[0] * 0.11, [index, module.position]);
  const animation = useRef({
    hover: 0,
    active: isActive ? 1 : 0,
    press: 0,
    ripple: 1.2,
    flash: 0,
  });

  useCursor(hovered);

  const ledColor = useMemo(() => {
    return new THREE.Color(module.accent).lerp(new THREE.Color("#6fe2ff"), 0.72);
  }, [module.accent]);
  const labelColor = useMemo(() => {
    return new THREE.Color(module.accent).lerp(new THREE.Color("#f3f8ff"), 0.46);
  }, [module.accent]);
  const labelGlowColor = useMemo(() => {
    return new THREE.Color(module.accent).lerp(new THREE.Color("#ffffff"), 0.08);
  }, [module.accent]);
  const ledIdleColor = useMemo(() => new THREE.Color("#ffffff"), []);
  const ledHoverColor = useMemo(() => new THREE.Color("#ffffff"), []);
  const ledScratchColor = useRef(new THREE.Color());
  const ledScratchEmissive = useRef(new THREE.Color());
  const labelScratchColor = useRef(new THREE.Color());
  const labelScratchGlowColor = useRef(new THREE.Color());

  const glowTexture = useMemo(() => getRadialGlowTexture(), []);
  const ledGradientTexture = useMemo(() => getLedGradientTexture(), []);

  useEffect(() => {
    void document.fonts.ready.then(() => setFontReady(true));
  }, []);

  const textures = useMemo(() => {
    if (typeof document === "undefined") {
      return { base: null, active: null };
    }

    if (!fontReady) {
      return {
        base: createButtonLabelTexture(module, false),
        active: createButtonLabelTexture(module, true),
      };
    }

    return {
      base: createButtonLabelTexture(module, false),
      active: createButtonLabelTexture(module, true),
    };
  }, [fontReady, module]);

  useEffect(() => {
    return () => {
      textures.base?.dispose();
      textures.active?.dispose();
    };
  }, [textures]);

  const displayTexture = hovered || isActive ? textures.active : textures.base;
  useEffect(() => {
    gsap.to(animation.current, {
      hover: hovered ? 1 : 0,
      duration: hovered ? 0.22 : 0.35,
      ease: hovered ? "power2.out" : "power3.out",
    });
  }, [hovered]);

  useEffect(() => {
    gsap.to(animation.current, {
      active: isActive ? 1 : 0,
      duration: 0.4,
      ease: "power3.out",
    });
  }, [isActive]);

  useEffect(() => {
    if (!groupRef.current || introPlayedRef.current) {
      return;
    }

    introPlayedRef.current = true;

    const [x, y, z] = module.position;
    groupRef.current.position.set(x, y - 1.4, z + 0.6);
    groupRef.current.scale.setScalar(0.88);

    if (reducedMotion) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.scale.setScalar(1);
      return;
    }

    gsap.to(groupRef.current.position, {
      x,
      y,
      z,
      delay: index * 0.06,
      duration: 1.4,
      ease: "power4.out",
    });

    gsap.to(groupRef.current.scale, {
      x: 1,
      y: 1,
      z: 1,
      delay: index * 0.06,
      duration: 1.2,
      ease: "power4.out",
    });
  }, [index, module.position, reducedMotion]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const movement = animation.current;
    const emphasis = Math.max(movement.hover, movement.active);
    const hoverEmphasis = movement.hover;
    const activeEmphasis = movement.active;
    const ledColorMix = Math.min(1, activeEmphasis * 0.24 + hoverEmphasis * 1.08);
    const ledEnergy = activeEmphasis * 0.45 + hoverEmphasis * 1.4;
    const randomPulse =
      reducedMotion
        ? 0.18
        : 0.18 +
          Math.max(
            0,
            Math.sin(elapsed * 1.52 + ambientPulseSeed) * 0.18 +
              Math.sin(elapsed * 3.1 + ambientPulseSeed * 1.8) * 0.1,
          );
    const float = reducedMotion
      ? 0
      : Math.sin(elapsed * 0.95 + index * 0.6) * 0.06 +
        Math.cos(elapsed * 0.72 + index * 0.8) * 0.03;
    const targetY = module.position[1] + float + emphasis * 0.16 - movement.press * 0.11;

    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      module.position[0],
      0.08,
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY,
      0.08,
    );
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      module.position[2],
      0.08,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      0,
      0.08,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      0,
      0.08,
    );

    const scale = 1 + emphasis * 0.03;
    groupRef.current.scale.setScalar(scale);

    if (borderMaterialRef.current) {
      borderMaterialRef.current.color.copy(labelGlowColor);
      borderMaterialRef.current.opacity = 0.48 + hoverEmphasis * 0.96 + movement.flash * 0.08;
    }

    if (accentBorderMaterialRef.current) {
      accentBorderMaterialRef.current.color.copy(labelColor);
      accentBorderMaterialRef.current.opacity = 0.22 + hoverEmphasis * 0.72 + movement.flash * 0.08;
    }

    if (rippleMaterialRef.current) {
      rippleMaterialRef.current.opacity = Math.max(0, 0.7 - movement.ripple * 0.62);
    }

    if (ledMaterialRef.current) {
      ledScratchColor.current.copy(ledIdleColor).lerp(ledHoverColor, ledColorMix);
      ledScratchEmissive.current.copy(ledColor).lerp(new THREE.Color("#ffffff"), hoverEmphasis * 0.12);
      ledMaterialRef.current.color.copy(ledScratchColor.current);
      ledMaterialRef.current.emissive.copy(ledScratchEmissive.current);
      ledMaterialRef.current.opacity = 0.76 + randomPulse * 0.14 + ledEnergy * 0.14;
      ledMaterialRef.current.emissiveIntensity =
        2.4 + randomPulse * 3.8 + activeEmphasis * 1.6 + hoverEmphasis * 9.4 + movement.flash * 8.4;
    }

    if (ledMeshRef.current) {
      const ledScale = 1.09 + activeEmphasis * 0.02 + hoverEmphasis * 0.06;
      const ledThickness = 1 + activeEmphasis * 0.08 + hoverEmphasis * 0.26;
      ledMeshRef.current.scale.set(ledScale, ledThickness, ledScale);
    }

    if (pointLightRef.current) {
      pointLightRef.current.color.copy(ledScratchEmissive.current);
      pointLightRef.current.intensity =
        1.4 + activeEmphasis * 1.8 + hoverEmphasis * 7.6 + movement.flash * 4.5;
    }

    if (labelMaterialRef.current) {
      labelScratchColor.current.copy(labelColor).lerp(new THREE.Color("#ffffff"), 0.08 + hoverEmphasis * 0.16);
      labelMaterialRef.current.color.copy(labelScratchColor.current);
      labelMaterialRef.current.opacity = 0.98 + emphasis * 0.12;
    }

    if (labelGlowMaterialRef.current) {
      labelScratchGlowColor.current.copy(labelGlowColor).lerp(new THREE.Color("#ffffff"), 0.06 + hoverEmphasis * 0.18);
      labelGlowMaterialRef.current.color.copy(labelScratchGlowColor.current);
      labelGlowMaterialRef.current.opacity = 0.12 + emphasis * 1.3 + movement.flash * 0.24;
    }
  });

  function handlePointerOver(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setHovered(true);
    onHoverChange(module.id);
  }

  function handlePointerOut(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    setHovered(false);
    onHoverChange(null);
  }

  function triggerSelection() {
    onSelect(module.id);

    const timeline = gsap.timeline();
    timeline
      .to(animation.current, {
        press: 1,
        duration: 0.12,
        ease: "power2.out",
      })
      .to(
        animation.current,
        {
          press: 0,
          duration: 0.52,
          ease: "elastic.out(1, 0.55)",
        },
        ">-0.02",
      );

    timeline.fromTo(
      animation.current,
      { ripple: 0, flash: 1.1 },
      {
        ripple: 1.2,
        flash: 0,
        duration: 0.9,
        ease: "power3.out",
      },
      0,
    );
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    triggerSelection();
  }

  return (
    <group ref={groupRef} position={module.position} rotation={[0, yaw, 0]}>
      <mesh
        ref={ledMeshRef}
        castShadow
        receiveShadow
        geometry={geometrySet.led}
        position={[0, -geometrySet.height * 0.36, 0]}
        scale={[1.09, 1, 1.09]}
      >
        <meshStandardMaterial
          ref={ledMaterialRef}
          color="#ffffff"
          map={ledGradientTexture}
          emissive="#7ce6ff"
          emissiveIntensity={4.2}
          metalness={0.16}
          roughness={0.22}
          transparent
          opacity={0.82}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        geometry={geometrySet.base}
        frustumCulled={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshPhysicalMaterial
          color="#091120"
          emissive="#091326"
          emissiveIntensity={0.1}
          metalness={0.96}
          roughness={0.2}
          clearcoat={1}
          clearcoatRoughness={0.08}
          reflectivity={1}
          fog={false}
        />
        <meshPhysicalMaterial
          color="#040814"
          emissive="#050d1b"
          emissiveIntensity={0.05}
          metalness={0.98}
          roughness={0.3}
          clearcoat={0.75}
          clearcoatRoughness={0.16}
          fog={false}
        />
      </mesh>

      <mesh
        castShadow
        receiveShadow
        geometry={geometrySet.cap}
        position={[0, geometrySet.height * 0.28, 0]}
        scale={[0.91, 1, 0.91]}
        frustumCulled={false}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshPhysicalMaterial
          color="#121c2d"
          emissive="#101a2a"
          emissiveIntensity={0.06}
          metalness={0.78}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.05}
          fog={false}
        />
      </mesh>

      <lineLoop
        geometry={geometrySet.outline}
        position={[0, geometrySet.height * 0.58, 0]}
        scale={[0.948, 1, 0.948]}
      >
        <lineBasicMaterial
          ref={borderMaterialRef}
          color={module.accent}
          transparent
          opacity={0.54}
          toneMapped={false}
          fog={false}
        />
      </lineLoop>

      <lineLoop
        geometry={geometrySet.outline}
        position={[0, -geometrySet.height * 0.02, 0]}
        scale={[1.03, 1, 1.03]}
      >
        <lineBasicMaterial
          ref={accentBorderMaterialRef}
          color={module.accent}
          transparent
          opacity={0.26}
          toneMapped={false}
          fog={false}
        />
      </lineLoop>

      <mesh
        position={[0, -geometrySet.height * 0.82, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[2.1, 1.4, 1]}
      >
        <planeGeometry args={[1.85, 1.2]} />
        <meshBasicMaterial
          map={glowTexture}
          color={ledColor}
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      <mesh
        position={[0, -geometrySet.height * 0.88, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[2.75, 1.9, 1]}
      >
        <planeGeometry args={[1.8, 1.1]} />
        <meshBasicMaterial
          map={glowTexture}
          color="#3c7bff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          fog={false}
        />
      </mesh>

      <lineLoop
        geometry={geometrySet.outline}
        position={[0, -geometrySet.height * 0.52, 0]}
        scale={[1.0, 1, 1.0]}
      >
        <lineBasicMaterial
          ref={rippleMaterialRef}
          color={module.accent}
          transparent
          opacity={0}
          toneMapped={false}
          fog={false}
        />
      </lineLoop>

      {displayTexture ? (
        <>
          <mesh
            geometry={geometrySet.labelPlane}
            position={[0, geometrySet.height * 0.742, 0.012]}
            rotation={[-Math.PI / 2, 0, -(yaw + boardYaw)]}
            scale={[0.98, 0.98, 1]}
            frustumCulled={false}
          >
            <meshBasicMaterial
              ref={labelGlowMaterialRef}
              map={displayTexture}
              color={module.accent}
              transparent
              opacity={0.06}
              toneMapped={false}
              fog={false}
              depthWrite={false}
              premultipliedAlpha
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          <mesh
            geometry={geometrySet.labelPlane}
            position={[0, geometrySet.height * 0.744, 0.02]}
            rotation={[-Math.PI / 2, 0, -(yaw + boardYaw)]}
            frustumCulled={false}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
          >
            <meshBasicMaterial
              ref={labelMaterialRef}
              map={displayTexture}
              color={module.accent}
              transparent
              opacity={0.96}
              toneMapped={false}
              fog={false}
              depthWrite={false}
              premultipliedAlpha
            />
          </mesh>
        </>
      ) : null}

      <Html
        center
        position={[0, geometrySet.height * 0.82, 0]}
        rotation={[0, 0, -(yaw + boardYaw)]}
        portal={undefined}
      >
        <button
          type="button"
          aria-label={module.label}
          data-module-id={module.id}
          onMouseEnter={() => {
            setHovered(true);
            onHoverChange(module.id);
          }}
          onMouseLeave={() => {
            setHovered(false);
            onHoverChange(null);
          }}
          onFocus={() => {
            setHovered(true);
            onHoverChange(module.id);
          }}
          onBlur={() => {
            setHovered(false);
            onHoverChange(null);
          }}
          onClick={(event) => {
            event.stopPropagation();
            triggerSelection();
          }}
          className="pointer-events-auto block cursor-pointer rounded-none border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
          style={{
            width: isMobile ? "108px" : "132px",
            height: isMobile ? "72px" : "88px",
            clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          }}
        />
      </Html>

      <pointLight
        ref={pointLightRef}
        color={ledColor}
        intensity={3.1}
        distance={4.8}
        decay={2}
        position={[0, -0.18, 0]}
      />
      <pointLight
        color={ledColor}
        intensity={1.45}
        distance={3.6}
        decay={2}
        position={[0, 0.18, 0]}
      />
    </group>
  );
}

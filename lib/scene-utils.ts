import * as THREE from "three";
import type { IconNode, ModuleConfig } from "@/lib/module-data";

export interface HexGeometrySet {
  base: THREE.ExtrudeGeometry;
  cap: THREE.ExtrudeGeometry;
  led: THREE.ExtrudeGeometry;
  labelPlane: THREE.PlaneGeometry;
  outline: THREE.BufferGeometry;
  height: number;
}

export interface CircuitTextureSet {
  base: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
}

const ICON_STROKE_LOOKUP: Record<string, number> = {
  bot: 2,
  "credit-card": 2,
  headphones: 2,
  history: 2,
  image: 2,
  languages: 2,
  settings: 2,
  users: 2,
  video: 2,
  wallet: 2,
};

let radialGlowTexture: THREE.CanvasTexture | null = null;
let circuitTextureSet: CircuitTextureSet | null = null;
let ledGradientTexture: THREE.CanvasTexture | null = null;

const LABEL_TEXTURE_LAYOUT = {
  centerX: 512,
  iconCenterY: 302,
  textCenterY: 558,
  textMaxWidth: 760,
};
const LABEL_BRIGHTNESS_MULTIPLIER = 1.28;

export function createHexGeometrySet(
  radius = 1.48,
  cornerRadius = 0.18,
): HexGeometrySet {
  const shape = createRoundedHexShape(radius, cornerRadius);
  const baseHeight = 1.32;
  const base = extrudeShape(shape, baseHeight, 0.12, 0.05);
  const cap = extrudeShape(shape, 0.11, 0.06, 0.024);
  const led = extrudeShape(shape, 0.22, 0.082, 0.038);
  const labelPlane = new THREE.PlaneGeometry(2.15, 1.55, 1, 1);
  const outline = createOutlineGeometry(shape);

  return {
    base,
    cap,
    led,
    labelPlane,
    outline,
    height: baseHeight,
  };
}

export function disposeHexGeometrySet(geometrySet: HexGeometrySet) {
  geometrySet.base.dispose();
  geometrySet.cap.dispose();
  geometrySet.led.dispose();
  geometrySet.labelPlane.dispose();
  geometrySet.outline.dispose();
}

function extrudeShape(
  shape: THREE.Shape,
  depth: number,
  bevelSize: number,
  bevelThickness: number,
) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 48,
    bevelEnabled: true,
    bevelSegments: 6,
    bevelSize,
    bevelThickness,
  });

  geometry.rotateX(Math.PI / 2);
  geometry.center();
  geometry.computeVertexNormals();

  return geometry;
}

function createRoundedHexShape(radius: number, cornerRadius: number) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index;
    return new THREE.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius);
  });

  const shape = new THREE.Shape();

  points.forEach((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];

    const fromPrevious = previous.clone().sub(point).normalize();
    const toNext = next.clone().sub(point).normalize();

    const start = point.clone().add(fromPrevious.multiplyScalar(cornerRadius));
    const end = point.clone().add(toNext.multiplyScalar(cornerRadius));

    if (index === 0) {
      shape.moveTo(start.x, start.y);
    } else {
      shape.lineTo(start.x, start.y);
    }

    shape.quadraticCurveTo(point.x, point.y, end.x, end.y);
  });

  shape.closePath();
  return shape;
}

function createOutlineGeometry(shape: THREE.Shape) {
  const points = shape.getSpacedPoints(72);
  const vertices = points.map((point) => new THREE.Vector3(point.x, 0, point.y));
  return new THREE.BufferGeometry().setFromPoints(vertices);
}

export function createButtonLabelTexture(
  module: ModuleConfig,
  emphasized = false,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1536;

  const context = canvas.getContext("2d");
  if (!context) {
    const fallbackTexture = new THREE.CanvasTexture(canvas);
    fallbackTexture.needsUpdate = true;
    return fallbackTexture;
  }

  const scale = canvas.width / 1024;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, 1024, 768);

  const accentRgb = hexToRgb(module.accent);
  const bodyFamily = getComputedStyle(document.body)
    .getPropertyValue("--font-body-family")
    .trim();
  const displayFamily = getComputedStyle(document.body)
    .getPropertyValue("--font-display-family")
    .trim();

  drawModuleIcon(context, module, accentRgb, emphasized, LABEL_TEXTURE_LAYOUT);

  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${module.label.length > 13 ? 66 : 72}px ${displayFamily || bodyFamily || "sans-serif"}`;
  context.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 1)`;
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${emphasized ? 1 : 0.78})`;
  context.shadowBlur = emphasized ? 26 : 10;
  context.filter = `brightness(${emphasized ? 1.32 : LABEL_BRIGHTNESS_MULTIPLIER})`;
  context.fillText(
    module.label,
    LABEL_TEXTURE_LAYOUT.centerX,
    LABEL_TEXTURE_LAYOUT.textCenterY,
    LABEL_TEXTURE_LAYOUT.textMaxWidth,
  );
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;

  return texture;
}

export function getRadialGlowTexture() {
  if (radialGlowTexture) {
    return radialGlowTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");

  if (!context) {
    radialGlowTexture = new THREE.CanvasTexture(canvas);
    return radialGlowTexture;
  }

  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.22, "rgba(255,255,255,0.65)");
  gradient.addColorStop(0.48, "rgba(255,255,255,0.24)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  radialGlowTexture = new THREE.CanvasTexture(canvas);
  radialGlowTexture.colorSpace = THREE.SRGBColorSpace;
  radialGlowTexture.needsUpdate = true;
  radialGlowTexture.minFilter = THREE.LinearFilter;
  radialGlowTexture.magFilter = THREE.LinearFilter;

  return radialGlowTexture;
}

export function getLedGradientTexture() {
  if (ledGradientTexture) {
    return ledGradientTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const context = canvas.getContext("2d");

  if (!context) {
    ledGradientTexture = new THREE.CanvasTexture(canvas);
    return ledGradientTexture;
  }

  const diagonalGradient = context.createLinearGradient(96, 120, 672, 648);
  diagonalGradient.addColorStop(0, "#f7fbff");
  diagonalGradient.addColorStop(0.18, "#8ff3ff");
  diagonalGradient.addColorStop(0.46, "#2fa8ff");
  diagonalGradient.addColorStop(0.72, "#4d66ff");
  diagonalGradient.addColorStop(0.9, "#8d63ff");
  diagonalGradient.addColorStop(1, "#f4f8ff");
  context.fillStyle = diagonalGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cyanBloom = context.createRadialGradient(154, 176, 20, 154, 176, 238);
  cyanBloom.addColorStop(0, "rgba(235, 252, 255, 0.92)");
  cyanBloom.addColorStop(0.2, "rgba(132, 243, 255, 0.68)");
  cyanBloom.addColorStop(0.55, "rgba(63, 168, 255, 0.24)");
  cyanBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = cyanBloom;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const violetBloom = context.createRadialGradient(610, 600, 16, 610, 600, 224);
  violetBloom.addColorStop(0, "rgba(243, 247, 255, 0.82)");
  violetBloom.addColorStop(0.22, "rgba(170, 150, 255, 0.58)");
  violetBloom.addColorStop(0.58, "rgba(92, 74, 255, 0.24)");
  violetBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = violetBloom;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sheen = context.createLinearGradient(128, 80, 640, 700);
  sheen.addColorStop(0, "rgba(255,255,255,0.2)");
  sheen.addColorStop(0.22, "rgba(255,255,255,0.04)");
  sheen.addColorStop(0.7, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(255,255,255,0.08)");
  context.fillStyle = sheen;
  context.fillRect(0, 0, canvas.width, canvas.height);

  ledGradientTexture = new THREE.CanvasTexture(canvas);
  ledGradientTexture.colorSpace = THREE.SRGBColorSpace;
  ledGradientTexture.needsUpdate = true;
  ledGradientTexture.minFilter = THREE.LinearFilter;
  ledGradientTexture.magFilter = THREE.LinearFilter;

  return ledGradientTexture;
}

export function getCircuitTextureSet() {
  if (circuitTextureSet) {
    return circuitTextureSet;
  }

  const size = 1024;
  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = size;
  baseCanvas.height = size;
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = size;
  glowCanvas.height = size;

  const baseContext = baseCanvas.getContext("2d");
  const glowContext = glowCanvas.getContext("2d");

  if (!baseContext || !glowContext) {
    circuitTextureSet = {
      base: new THREE.CanvasTexture(baseCanvas),
      glow: new THREE.CanvasTexture(glowCanvas),
    };
    return circuitTextureSet;
  }

  baseContext.clearRect(0, 0, size, size);
  glowContext.clearRect(0, 0, size, size);

  paintCircuitSubstrate(baseContext, glowContext, size);

  const traces = createCircuitTraceBlueprints();

  traces.forEach((trace, index) => {
    drawCircuitTrace(baseContext, glowContext, trace, size, index);
  });

  drawCircuitSpecks(baseContext, glowContext, size);

  circuitTextureSet = {
    base: createCanvasTexture(baseCanvas),
    glow: createCanvasTexture(glowCanvas),
  };

  return circuitTextureSet;
}

function drawModuleIcon(
  context: CanvasRenderingContext2D,
  module: ModuleConfig,
  accentRgb: { r: number; g: number; b: number },
  emphasized: boolean,
  layout: typeof LABEL_TEXTURE_LAYOUT,
) {
  switch (module.id) {
    case "ai-viet-noi-dung":
      drawContentBadgeIcon(context, accentRgb, emphasized, layout);
      return;
    case "dich-thuat":
      drawTranslateIcon(context, accentRgb, emphasized, layout);
      return;
    case "mua-api":
      drawApiCloudIcon(context, accentRgb, emphasized, layout);
      return;
    case "ai-giong-noi":
      drawVoiceArcIcon(context, accentRgb, emphasized, layout);
      return;
    case "affiliate":
      drawAffiliateIcon(context, accentRgb, emphasized, layout);
      return;
    default:
      drawLucideGlyph(
        context,
        module.iconNode,
        module.iconName,
        accentRgb,
        emphasized,
        layout,
      );
  }
}

function drawLucideGlyph(
  context: CanvasRenderingContext2D,
  iconNode: IconNode,
  iconName: string,
  accentRgb: { r: number; g: number; b: number },
  emphasized: boolean,
  layout: typeof LABEL_TEXTURE_LAYOUT,
) {
  const glowOpacity = emphasized ? 1 : 0.86;
  const crispOpacity = 0.96;

  context.save();
  context.translate(layout.centerX, layout.iconCenterY);
  context.scale(11.9, 11.9);
  context.translate(-12, -12);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = ICON_STROKE_LOOKUP[iconName] ?? 2;
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${glowOpacity})`;
  context.shadowBlur = emphasized ? 26 : 12;
  context.filter = `brightness(${emphasized ? 1.35 : LABEL_BRIGHTNESS_MULTIPLIER})`;
  context.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${glowOpacity})`;

  iconNode.forEach(([element, attributes]) => {
    drawIconElement(context, element, attributes, false);
  });

  context.shadowBlur = 0;
  context.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${crispOpacity})`;

  iconNode.forEach(([element, attributes]) => {
    drawIconElement(context, element, attributes, false);
  });
  context.restore();
}

function drawContentBadgeIcon(
  context: CanvasRenderingContext2D,
  accentRgb: { r: number; g: number; b: number },
  emphasized: boolean,
  layout: typeof LABEL_TEXTURE_LAYOUT,
) {
  context.save();
  context.translate(layout.centerX, layout.iconCenterY - 8);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 16;
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${emphasized ? 1 : 0.82})`;
  context.shadowBlur = emphasized ? 28 : 14;
  context.filter = `brightness(${emphasized ? 1.35 : LABEL_BRIGHTNESS_MULTIPLIER})`;
  context.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 1)`;

  const hex = [
    [-92, -30],
    [-34, -84],
    [46, -68],
    [88, -6],
    [26, 52],
    [-58, 38],
  ];
  context.beginPath();
  hex.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.closePath();
  context.stroke();

  context.beginPath();
  context.moveTo(-42, 18);
  context.lineTo(2, -26);
  context.lineTo(26, -2);
  context.stroke();

  context.beginPath();
  context.arc(20, -8, 14, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawTranslateIcon(
  context: CanvasRenderingContext2D,
  accentRgb: { r: number; g: number; b: number },
  emphasized: boolean,
  layout: typeof LABEL_TEXTURE_LAYOUT,
) {
  const glow = emphasized ? 0.92 : 0.78;
  context.save();
  context.translate(layout.centerX, layout.iconCenterY - 12);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 14;
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${glow})`;
  context.shadowBlur = emphasized ? 24 : 14;
  context.filter = `brightness(${LABEL_BRIGHTNESS_MULTIPLIER})`;
  context.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.96)`;

  roundedRect(context, -86, -60, 112, 124, 20);
  context.stroke();
  context.beginPath();
  roundedRect(context, -8, -44, 112, 124, 20);
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.98)`;
  context.font = "italic 700 62px sans-serif";
  context.fillText("A", -45, 24);
  context.font = "700 56px sans-serif";
  context.fillText("文", 35, 40);
  context.restore();
}

function drawApiCloudIcon(
  context: CanvasRenderingContext2D,
  accentRgb: { r: number; g: number; b: number },
  emphasized: boolean,
  layout: typeof LABEL_TEXTURE_LAYOUT,
) {
  context.save();
  context.translate(layout.centerX, layout.iconCenterY - 14);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 16;
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${emphasized ? 1 : 0.82})`;
  context.shadowBlur = emphasized ? 28 : 14;
  context.filter = `brightness(${emphasized ? 1.35 : LABEL_BRIGHTNESS_MULTIPLIER})`;
  context.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 1)`;

  context.beginPath();
  context.moveTo(-78, 32);
  context.bezierCurveTo(-112, 32, -118, -12, -84, -20);
  context.bezierCurveTo(-82, -54, -48, -76, -12, -72);
  context.bezierCurveTo(10, -100, 62, -88, 78, -52);
  context.bezierCurveTo(114, -48, 120, 0, 88, 22);
  context.lineTo(-78, 32);
  context.closePath();
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.98)`;
  context.font = "italic 800 54px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("API", 0, 4);
  context.restore();
}

function drawVoiceArcIcon(
  context: CanvasRenderingContext2D,
  accentRgb: { r: number; g: number; b: number },
  emphasized: boolean,
  layout: typeof LABEL_TEXTURE_LAYOUT,
) {
  context.save();
  context.translate(layout.centerX, layout.iconCenterY - 20);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 16;
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${emphasized ? 1 : 0.82})`;
  context.shadowBlur = emphasized ? 28 : 14;
  context.filter = `brightness(${emphasized ? 1.35 : LABEL_BRIGHTNESS_MULTIPLIER})`;
  context.strokeStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 1)`;

  context.beginPath();
  context.arc(0, 0, 94, Math.PI * 0.2, Math.PI * 0.8, true);
  context.stroke();

  const bars = [
    { x: -54, h: 38 },
    { x: -26, h: 62 },
    { x: 0, h: 84 },
    { x: 26, h: 62 },
    { x: 54, h: 38 },
  ];
  bars.forEach(({ x, h }) => {
    context.beginPath();
    context.moveTo(x, 44 - h / 2);
    context.lineTo(x, 44 + h / 2);
    context.stroke();
  });
  context.restore();
}

function drawAffiliateIcon(
  context: CanvasRenderingContext2D,
  accentRgb: { r: number; g: number; b: number },
  emphasized: boolean,
  layout: typeof LABEL_TEXTURE_LAYOUT,
) {
  context.save();
  context.translate(layout.centerX, layout.iconCenterY - 2);
  context.fillStyle = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.98)`;
  context.shadowColor = `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${emphasized ? 1 : 0.82})`;
  context.shadowBlur = emphasized ? 28 : 14;
  context.filter = `brightness(${emphasized ? 1.35 : LABEL_BRIGHTNESS_MULTIPLIER})`;

  [
    { x: -38, y: -28, r: 18 },
    { x: 0, y: -42, r: 22 },
    { x: 42, y: -26, r: 18 },
  ].forEach(({ x, y, r }) => {
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  });

  const shoulders = [
    { x: -38, y: 26, rx: 30, ry: 20 },
    { x: 0, y: 22, rx: 40, ry: 24 },
    { x: 42, y: 26, rx: 30, ry: 20 },
  ];

  shoulders.forEach(({ x, y, rx, ry }) => {
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawIconElement(
  context: CanvasRenderingContext2D,
  element: string,
  attributes: Record<string, string>,
  fill = false,
) {
  context.beginPath();

  switch (element) {
    case "path": {
      const path = new Path2D(attributes.d ?? "");
      if (fill) {
        context.fill(path);
      } else {
        context.stroke(path);
      }
      return;
    }
    case "rect": {
      const x = Number(attributes.x ?? 0);
      const y = Number(attributes.y ?? 0);
      const width = Number(attributes.width ?? 0);
      const height = Number(attributes.height ?? 0);
      const radius = Number(attributes.rx ?? 0);
      roundedRect(context, x, y, width, height, radius);
      break;
    }
    case "circle": {
      const x = Number(attributes.cx ?? 0);
      const y = Number(attributes.cy ?? 0);
      const radius = Number(attributes.r ?? 0);
      context.arc(x, y, radius, 0, Math.PI * 2);
      break;
    }
    case "ellipse": {
      const x = Number(attributes.cx ?? 0);
      const y = Number(attributes.cy ?? 0);
      const rx = Number(attributes.rx ?? 0);
      const ry = Number(attributes.ry ?? 0);
      context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      break;
    }
    case "line": {
      context.moveTo(Number(attributes.x1 ?? 0), Number(attributes.y1 ?? 0));
      context.lineTo(Number(attributes.x2 ?? 0), Number(attributes.y2 ?? 0));
      break;
    }
    case "polyline":
    case "polygon": {
      const values = (attributes.points ?? "")
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(",").map(Number));

      values.forEach(([x, y], index) => {
        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });

      if (element === "polygon") {
        context.closePath();
      }
      break;
    }
    default:
      return;
  }

  if (fill) {
    context.fill();
  } else {
    context.stroke();
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clampedRadius = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + clampedRadius, y);
  context.arcTo(x + width, y, x + width, y + height, clampedRadius);
  context.arcTo(x + width, y + height, x, y + height, clampedRadius);
  context.arcTo(x, y + height, x, y, clampedRadius);
  context.arcTo(x, y, x + width, y, clampedRadius);
  context.closePath();
}

function hexToRgb(hex: string) {
  const sanitized = hex.replace("#", "");
  const normalized = sanitized.length === 3
    ? sanitized
        .split("")
        .map((part) => part + part)
        .join("")
    : sanitized;

  const numeric = Number.parseInt(normalized, 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

interface CircuitTrace {
  color: string;
  width: number;
  points: [number, number][];
  coreColor?: string;
  innerColor?: string;
  alpha?: number;
  glowBoost?: number;
  viaStep?: number;
}

function paintCircuitSubstrate(
  baseContext: CanvasRenderingContext2D,
  glowContext: CanvasRenderingContext2D,
  size: number,
) {
  const baseGradient = baseContext.createLinearGradient(0, 0, size, size);
  baseGradient.addColorStop(0, "#01030a");
  baseGradient.addColorStop(0.32, "#040917");
  baseGradient.addColorStop(0.58, "#020612");
  baseGradient.addColorStop(1, "#000208");
  baseContext.fillStyle = baseGradient;
  baseContext.fillRect(0, 0, size, size);

  const centerBloom = baseContext.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.62,
  );
  centerBloom.addColorStop(0, "rgba(44, 116, 255, 0.26)");
  centerBloom.addColorStop(0.42, "rgba(16, 44, 114, 0.14)");
  centerBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  baseContext.fillStyle = centerBloom;
  baseContext.fillRect(0, 0, size, size);

  const violetSpill = baseContext.createRadialGradient(
    size * 0.48,
    size * 0.58,
    size * 0.02,
    size * 0.48,
    size * 0.58,
    size * 0.38,
  );
  violetSpill.addColorStop(0, "rgba(116, 92, 255, 0.2)");
  violetSpill.addColorStop(0.5, "rgba(55, 33, 141, 0.08)");
  violetSpill.addColorStop(1, "rgba(0, 0, 0, 0)");
  baseContext.fillStyle = violetSpill;
  baseContext.fillRect(0, 0, size, size);

  drawSubstrateNoise(baseContext, size);
  drawSubstrateEtching(baseContext, size);

  glowContext.save();
  const ambientGlow = glowContext.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.72,
  );
  ambientGlow.addColorStop(0, "rgba(84, 216, 255, 0.16)");
  ambientGlow.addColorStop(0.36, "rgba(42, 118, 255, 0.1)");
  ambientGlow.addColorStop(0.62, "rgba(105, 85, 255, 0.08)");
  ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  glowContext.fillStyle = ambientGlow;
  glowContext.fillRect(0, 0, size, size);
  glowContext.restore();
}

function drawSubstrateNoise(
  context: CanvasRenderingContext2D,
  size: number,
) {
  context.save();

  for (let index = 0; index < 2600; index += 1) {
    const x = pseudoRandom(index * 1.37 + 0.8) * size;
    const y = pseudoRandom(index * 1.91 + 3.2) * size;
    const alpha = 0.02 + pseudoRandom(index * 0.73 + 2.1) * 0.045;
    const radius = 0.4 + pseudoRandom(index * 1.23 + 5.4) * 1.35;
    context.fillStyle = `rgba(170, 214, 255, ${alpha})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawSubstrateEtching(
  context: CanvasRenderingContext2D,
  size: number,
) {
  const etchTraces: CircuitTrace[] = [
    { color: "rgba(26, 55, 112, 0.18)", width: 0.9, points: [[0.04, 0.80], [0.18, 0.80], [0.30, 0.68], [0.44, 0.68], [0.50, 0.62]] },
    { color: "rgba(28, 62, 118, 0.16)", width: 0.84, points: [[0.08, 0.72], [0.22, 0.72], [0.34, 0.62], [0.46, 0.62], [0.50, 0.58]] },
    { color: "rgba(31, 58, 128, 0.16)", width: 0.82, points: [[0.18, 0.96], [0.18, 0.84], [0.24, 0.78], [0.24, 0.64], [0.32, 0.56]] },
    { color: "rgba(30, 56, 126, 0.14)", width: 0.78, points: [[0.26, 0.96], [0.26, 0.88], [0.32, 0.82], [0.32, 0.70], [0.38, 0.64]] },
  ];

  etchTraces.forEach((trace) => {
    mapQuadrants(trace.points).forEach((points) => {
      context.save();
      context.strokeStyle = trace.color;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = trace.width;
      drawPolyline(
        context,
        points.map(([x, y]) => [x * size, y * size] as const),
      );
      context.restore();
    });
  });
}

function createCircuitTraceBlueprints() {
  const traces: CircuitTrace[] = [];
  const topLeftRoutes: CircuitTrace[] = [
    {
      color: "#1d76ff",
      coreColor: "#82ebff",
      innerColor: "rgba(245, 252, 255, 0.99)",
      width: 3.1,
      alpha: 0.99,
      glowBoost: 1.64,
      viaStep: 1,
      points: [[0.02, 0.80], [0.18, 0.80], [0.30, 0.68], [0.42, 0.68], [0.46, 0.64], [0.46, 0.48]],
    },
    {
      color: "#2370ff",
      coreColor: "#79e3ff",
      innerColor: "rgba(242, 251, 255, 0.98)",
      width: 2.62,
      alpha: 0.95,
      glowBoost: 1.5,
      viaStep: 1,
      points: [[0.04, 0.74], [0.20, 0.74], [0.32, 0.64], [0.44, 0.64], [0.48, 0.60], [0.48, 0.46]],
    },
    {
      color: "#285fff",
      coreColor: "#74d7ff",
      innerColor: "rgba(240, 250, 255, 0.97)",
      width: 2.12,
      alpha: 0.88,
      glowBoost: 1.34,
      viaStep: 2,
      points: [[0.08, 0.68], [0.24, 0.68], [0.34, 0.60], [0.46, 0.60], [0.49, 0.56], [0.49, 0.44]],
    },
    {
      color: "#3157ff",
      coreColor: "#6ed0ff",
      innerColor: "rgba(238, 248, 255, 0.95)",
      width: 1.68,
      alpha: 0.8,
      glowBoost: 1.18,
      viaStep: 2,
      points: [[0.12, 0.62], [0.28, 0.62], [0.38, 0.56], [0.46, 0.56], [0.49, 0.53], [0.49, 0.42]],
    },
    {
      color: "#275dff",
      coreColor: "#71dbff",
      innerColor: "rgba(240, 250, 255, 0.96)",
      width: 1.86,
      alpha: 0.86,
      glowBoost: 1.2,
      viaStep: 2,
      points: [[0.18, 0.96], [0.18, 0.82], [0.24, 0.76], [0.24, 0.62], [0.32, 0.54], [0.38, 0.54]],
    },
    {
      color: "#3154ff",
      coreColor: "#7f8bff",
      innerColor: "rgba(236, 244, 255, 0.92)",
      width: 1.46,
      alpha: 0.74,
      glowBoost: 1.06,
      viaStep: 3,
      points: [[0.26, 0.96], [0.26, 0.88], [0.32, 0.82], [0.32, 0.70], [0.38, 0.64], [0.42, 0.64]],
    },
    {
      color: "#4b54ff",
      coreColor: "#8e86ff",
      innerColor: "rgba(234, 243, 255, 0.94)",
      width: 1.32,
      alpha: 0.66,
      glowBoost: 1.0,
      viaStep: 3,
      points: [[0.02, 0.88], [0.16, 0.88], [0.28, 0.78], [0.40, 0.78]],
    },
  ];

  topLeftRoutes.forEach((trace) => {
    mapQuadrants(trace.points).forEach((points) => {
      traces.push({
        ...trace,
        points,
      });
    });
  });

  return traces;
}

function mapQuadrants(points: [number, number][]) {
  return [
    points,
    points.map(([x, y]) => [1 - x, y] as [number, number]),
    points.map(([x, y]) => [x, 1 - y] as [number, number]),
    points.map(([x, y]) => [1 - x, 1 - y] as [number, number]),
  ];
}

function drawCircuitTrace(
  baseContext: CanvasRenderingContext2D,
  glowContext: CanvasRenderingContext2D,
  trace: CircuitTrace,
  size: number,
  index: number,
) {
  const points = trace.points.map(([x, y]) => [x * size, y * size] as const);
  const glowColor = trace.coreColor ?? trace.color;
  const innerColor = trace.innerColor ?? "rgba(236,248,255,0.95)";
  const baseAlpha = trace.alpha ?? 0.82;
  const glowBoost = trace.glowBoost ?? 1;
  const viaStep = trace.viaStep ?? 2;

  glowContext.save();
  glowContext.strokeStyle = trace.color;
  glowContext.lineCap = "round";
  glowContext.lineJoin = "round";
  glowContext.lineWidth = trace.width * (5.2 * glowBoost);
  glowContext.shadowColor = trace.color;
  glowContext.shadowBlur = 38 * glowBoost;
  glowContext.globalAlpha = 0.18;
  drawPolyline(glowContext, points);
  glowContext.restore();

  glowContext.save();
  glowContext.strokeStyle = glowColor;
  glowContext.lineCap = "round";
  glowContext.lineJoin = "round";
  glowContext.lineWidth = trace.width * 2.15;
  glowContext.shadowColor = glowColor;
  glowContext.shadowBlur = 18 * glowBoost;
  glowContext.globalAlpha = 0.22;
  drawPolyline(glowContext, points);
  glowContext.restore();

  baseContext.save();
  baseContext.strokeStyle = trace.color;
  baseContext.lineCap = "round";
  baseContext.lineJoin = "round";
  baseContext.lineWidth = trace.width;
  baseContext.globalAlpha = baseAlpha;
  drawPolyline(baseContext, points);
  baseContext.restore();

  baseContext.save();
  baseContext.strokeStyle = glowColor;
  baseContext.lineCap = "round";
  baseContext.lineJoin = "round";
  baseContext.lineWidth = Math.max(1.05, trace.width * 0.58);
  baseContext.globalAlpha = 0.92;
  drawPolyline(baseContext, points);
  baseContext.restore();

  baseContext.save();
  baseContext.strokeStyle = innerColor;
  baseContext.lineCap = "round";
  baseContext.lineJoin = "round";
  baseContext.lineWidth = Math.max(0.8, trace.width * 0.24);
  baseContext.globalAlpha = 0.98;
  drawPolyline(baseContext, points);
  baseContext.restore();

  points.forEach(([x, y], pointIndex) => {
    if (
      pointIndex === 0 ||
      pointIndex === points.length - 1 ||
      pointIndex % viaStep === 0
    ) {
      drawVia(baseContext, glowContext, x, y, trace.color, glowColor, trace.width);
    }
  });

  drawTravelPulse(glowContext, points, glowColor, trace.width, index, glowBoost);
}

function drawVia(
  baseContext: CanvasRenderingContext2D,
  glowContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  coreColor: string,
  width: number,
) {
  glowContext.save();
  glowContext.fillStyle = color;
  glowContext.shadowColor = color;
  glowContext.shadowBlur = 22;
  glowContext.globalAlpha = 0.22;
  glowContext.beginPath();
  glowContext.arc(x, y, width * 1.9, 0, Math.PI * 2);
  glowContext.fill();
  glowContext.restore();

  baseContext.save();
  baseContext.strokeStyle = coreColor;
  baseContext.lineWidth = Math.max(0.9, width * 0.28);
  baseContext.beginPath();
  baseContext.arc(x, y, width * 0.92, 0, Math.PI * 2);
  baseContext.stroke();
  baseContext.restore();

  baseContext.save();
  baseContext.fillStyle = "rgba(242, 250, 255, 0.98)";
  baseContext.beginPath();
  baseContext.arc(x, y, width * 0.44, 0, Math.PI * 2);
  baseContext.fill();
  baseContext.restore();
}

function drawPolyline(
  context: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
) {
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function createCanvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function drawTravelPulse(
  context: CanvasRenderingContext2D,
  points: readonly (readonly [number, number])[],
  color: string,
  width: number,
  index: number,
  glowBoost: number,
) {
  const totalSegments = points.length - 1;
  const segment = index % totalSegments;
  const a = points[segment];
  const b = points[segment + 1];
  const t = 0.55;
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;

  context.save();
  context.fillStyle = "rgba(245,250,255,0.95)";
  context.shadowColor = color;
  context.shadowBlur = 20 * glowBoost;
  context.globalAlpha = 0.34;
  context.beginPath();
  context.arc(x, y, width * 1.24, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawCircuitSpecks(
  baseContext: CanvasRenderingContext2D,
  glowContext: CanvasRenderingContext2D,
  size: number,
) {
  for (let index = 0; index < 110; index += 1) {
    const x = pseudoRandom(index * 2.37 + 11.2) * size;
    const y = pseudoRandom(index * 1.61 + 7.4) * size;
    const hueFlip = pseudoRandom(index * 1.17 + 3.9);
    const color = hueFlip > 0.82 ? "#8b74ff" : "#56dfff";
    const radius = 0.6 + pseudoRandom(index * 0.83 + 1.7) * 1.8;

    glowContext.save();
    glowContext.fillStyle = color;
    glowContext.shadowColor = color;
    glowContext.shadowBlur = 10;
    glowContext.globalAlpha = 0.1;
    glowContext.beginPath();
    glowContext.arc(x, y, radius * 1.45, 0, Math.PI * 2);
    glowContext.fill();
    glowContext.restore();

    baseContext.save();
    baseContext.fillStyle = "rgba(240, 250, 255, 0.96)";
    baseContext.beginPath();
    baseContext.arc(x, y, radius * 0.58, 0, Math.PI * 2);
    baseContext.fill();
    baseContext.restore();
  }
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453123;
  return value - Math.floor(value);
}

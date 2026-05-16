export const hologramBeamVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const hologramBeamFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  float verticalFade = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.68, vUv.y);
  float edge = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.6);
  float scan = 0.56 + 0.44 * sin((vUv.y * 16.0 - uTime * 2.2) * 6.28318);
  float band = smoothstep(
    0.18,
    0.0,
    abs(fract(vUv.y * 8.0 - uTime * 0.35 + vUv.x * 0.4) - 0.5)
  );
  float alpha = edge * verticalFade * (0.1 + scan * 0.12 + band * 0.08);
  vec3 color = uColor * (0.22 + scan * 0.75 + band * 0.35);
  gl_FragColor = vec4(color, alpha);
}
`;

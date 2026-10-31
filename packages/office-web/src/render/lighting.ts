import { Container, Mesh, MeshGeometry, RenderTexture, Shader, UniformGroup, type Renderer } from 'pixi.js';

const VERT = /* glsl */ `
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}`;

const FRAG = /* glsl */ `
precision mediump float;
in vec2 vUV;
out vec4 finalColor;
uniform sampler2D uScene;
uniform sampler2D uLight;
uniform vec3 uAmbient;
uniform float uLights;
uniform float uNight;
uniform vec2 uTexel;
uniform float uTime;
uniform float uGrain;
uniform float uVignette;
uniform vec3 uShadowTint;
uniform float uFog;
uniform vec3 uFogColor;
uniform float uSaturation;
uniform float uWarmth;
uniform float uBloom;

void main() {
  vec4 sc = texture(uScene, vUV);
  vec3 L = texture(uLight, vUV).rgb;
  // soft bloom from the light buffer (already low-res, so a small kernel spreads wide)
  vec3 B = vec3(0.0);
  float tot = 0.0;
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      float w = 1.0 / (1.0 + float(i * i + j * j));
      B += texture(uLight, vUV + vec2(float(i), float(j)) * uTexel * 4.0).rgb * w;
      tot += w;
    }
  }
  B /= tot;
  vec3 lit = sc.rgb * (uAmbient + L * uLights);
  lit += B * uBloom * uLights * sc.a + B * uBloom * 0.35 * uNight * (1.0 - sc.a);
  // soft-knee tone mapping: untouched below 0.8, overlapping lamps roll off instead of clipping to white
  lit = lit / (1.0 + max(lit - 0.8, vec3(0.0)) * 0.9);
  float lum = dot(lit, vec3(0.299, 0.587, 0.114));
  // coloured shadows: darks drift towards violet-blue instead of grey
  lit += uShadowTint * 0.10 * (1.0 - smoothstep(0.0, 0.45, lum)) * sc.a;
  lit = mix(vec3(lum), lit, uSaturation);
  lit *= vec3(1.0 + uWarmth * 0.05, 1.0 + uWarmth * 0.01, 1.0 - uWarmth * 0.05);
  // fog thickens towards the horizon (top of the screen)
  lit = mix(lit, uFogColor * sc.a, uFog * (0.15 + 0.85 * (1.0 - vUV.y) * (1.0 - vUV.y)) * sc.a);
  vec2 d = vUV - 0.5;
  float vig = smoothstep(0.9, 0.3, length(d * vec2(1.05, 1.25)));
  lit *= mix(1.0, vig, uVignette);
  float n = fract(sin(dot(vUV * vec2(1931.7, 977.3) + uTime, vec2(12.9898, 78.233))) * 43758.5453);
  lit += (n - 0.5) * uGrain * sc.a;
  finalColor = vec4(max(lit, 0.0), sc.a);
}`;

export interface LightParams {
  ambient: [number, number, number];
  lights: number;
  night: number;
  time: number;
  grain: number;
  vignette: number;
  fog: number;
  fogColor: [number, number, number];
  saturation: number;
  warmth: number;
  bloom: number;
}

/**
 * Deferred-ish lighting: the scene and a light buffer are rendered to textures and combined
 * by a full-screen shader (ambient × albedo + lights, bloom, grading, vignette, grain).
 */
export class Lighting {
  sceneRT: RenderTexture;
  lightRT: RenderTexture;
  readonly mesh: Mesh<MeshGeometry, Shader>;
  private uniforms: UniformGroup;
  private w = 0;
  private h = 0;

  constructor(
    private readonly renderer: Renderer,
    w: number,
    h: number,
    private lightScale = 0.5,
  ) {
    const res = renderer.resolution;
    this.sceneRT = RenderTexture.create({ width: w, height: h, resolution: res, scaleMode: 'nearest' });
    this.lightRT = RenderTexture.create({ width: Math.ceil(w * lightScale), height: Math.ceil(h * lightScale), resolution: 1, scaleMode: 'linear' });
    this.uniforms = new UniformGroup({
      uAmbient: { value: new Float32Array([1, 1, 1]), type: 'vec3<f32>' },
      uLights: { value: 1, type: 'f32' },
      uNight: { value: 0, type: 'f32' },
      uTexel: { value: new Float32Array([1 / w, 1 / h]), type: 'vec2<f32>' },
      uTime: { value: 0, type: 'f32' },
      uGrain: { value: 0.025, type: 'f32' },
      uVignette: { value: 0.35, type: 'f32' },
      uShadowTint: { value: new Float32Array([0.32, 0.22, 0.62]), type: 'vec3<f32>' },
      uFog: { value: 0, type: 'f32' },
      uFogColor: { value: new Float32Array([0.8, 0.82, 0.88]), type: 'vec3<f32>' },
      uSaturation: { value: 1.05, type: 'f32' },
      uWarmth: { value: 0.5, type: 'f32' },
      uBloom: { value: 0.45, type: 'f32' },
    });
    const shader = Shader.from({
      gl: { vertex: VERT, fragment: FRAG, name: 'agent-office-composite' },
      resources: { uScene: this.sceneRT.source, uLight: this.lightRT.source, lighting: this.uniforms },
    });
    const geometry = new MeshGeometry({ positions: new Float32Array(8), uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), indices: new Uint32Array([0, 1, 2, 0, 2, 3]) });
    this.mesh = new Mesh({ geometry, shader });
    this.resize(w, h);
  }

  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.sceneRT.resize(w, h, this.renderer.resolution);
    this.lightRT.resize(Math.ceil(w * this.lightScale), Math.ceil(h * this.lightScale), 1);
    const pos = this.mesh.geometry.positions;
    pos.set([0, 0, w, 0, w, h, 0, h]);
    this.mesh.geometry.getBuffer('aPosition').update();
    (this.uniforms.uniforms.uTexel as Float32Array).set([1 / (w * this.lightScale), 1 / (h * this.lightScale)]);
  }

  render(scene: Container, lights: Container, p: LightParams): void {
    const u = this.uniforms.uniforms;
    (u.uAmbient as Float32Array).set(p.ambient);
    u.uLights = p.lights;
    u.uNight = p.night;
    u.uTime = p.time % 1000;
    u.uGrain = p.grain;
    u.uVignette = p.vignette;
    u.uFog = p.fog;
    (u.uFogColor as Float32Array).set(p.fogColor);
    u.uSaturation = p.saturation;
    u.uWarmth = p.warmth;
    u.uBloom = p.bloom;
    this.uniforms.update();
    this.renderer.render({ container: scene, target: this.sceneRT, clear: true, clearColor: [0, 0, 0, 0] });
    lights.scale.set(this.lightScale);
    this.renderer.render({ container: lights, target: this.lightRT, clear: true, clearColor: [0, 0, 0, 1] });
  }
}

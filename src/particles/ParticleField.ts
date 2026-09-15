import { config } from "../config";
import { clamp } from "../interaction/coordinates";
import type { Control, Vec3 } from "../interaction/types";
interface Wave {
  center: Vec3;
  age: number;
  power: number;
}
export class ParticleField {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  private anchors: Float32Array;
  private phases: Float32Array;
  private waves: Wave[] = [];
  time = 0;
  constructor(
    public count: number,
    seed = 42,
  ) {
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.anchors = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.phases = new Float32Array(count);
    let state = seed;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      const u = random(),
        theta = random() * Math.PI * 2,
        r = Math.pow(random(), 1.6) * 1.3;
      const x = (u - 0.5) * 12;
      const y = Math.cos(theta) * r + 0.5 * Math.sin(x * 0.7),
        z = Math.sin(theta) * r;
      this.anchors.set([x, y, z], i * 3);
      this.positions.set([x, y, z], i * 3);
      this.phases[i] = random() * Math.PI * 2;
      this.sizes[i] = random();
      const tint = (x + 6) / 12;
      this.colors.set([0.24 + tint * 0.5, 0.78 - tint * 0.45, 1], i * 3);
    }
  }
  step(rawDt: number, c: Control) {
    const dt = clamp(Number.isFinite(rawDt) ? rawDt : 0, 0, config.maxStep);
    this.time += dt;
    if (c.wave > 0 && this.waves.length < 12)
      this.waves.push({ center: { ...c.target }, age: 0, power: c.wave });
    for (const w of this.waves) w.age += dt;
    this.waves = this.waves.filter((w) => w.age < 2);
    for (let i = 0; i < this.count; i++) {
      const j = i * 3,
        x = this.positions[j],
        y = this.positions[j + 1],
        z = this.positions[j + 2],
        phase = this.phases[i],
        ax = this.anchors[j],
        ay =
          this.anchors[j + 1] +
          Math.sin(this.time * 0.6 + ax * 0.5 + phase) * 0.12,
        az = this.anchors[j + 2];
      let fx = (ax - x) * config.spring,
        fy = (ay - y) * config.spring,
        fz = (az - z) * config.spring;
      const dx = x - c.target.x,
        dy = y - c.target.y,
        dz = z - c.target.z,
        d = Math.hypot(dx, dy, dz),
        strength = c.strength;
      if (c.mode === "attract") {
        fx = (c.target.x + Math.cos(phase + this.time) * 0.28 - x) * 5;
        fy = (c.target.y + Math.sin(phase + this.time) * 0.28 - y) * 5;
        fz = (c.target.z + Math.sin(phase) * 0.28 - z) * 5;
        fx = fx * strength + (ax - x) * config.spring * (1 - strength);
        fy = fy * strength + (ay - y) * config.spring * (1 - strength);
        fz = fz * strength + (az - z) * config.spring * (1 - strength);
      }
      if (c.mode === "scatter") {
        const f = (22 * strength) / (1 + d * d * 0.3) / Math.max(0.2, d);
        fx += dx * f;
        fy += dy * f;
        fz += dz * f;
      }
      if (c.mode === "follow") {
        const f = 5 * strength * Math.exp((-d * d) / 14);
        fx -= dx * f;
        fy -= dy * f;
        fz -= dz * f;
      }
      for (const w of this.waves) {
        const wx = x - w.center.x,
          wy = y - w.center.y,
          wz = z - w.center.z,
          wd = Math.hypot(wx, wy, wz);
        const f =
          (Math.exp(-Math.pow(wd - w.age * 6, 2) * 3) *
            w.power *
            25 *
            (1 - w.age / 2)) /
          Math.max(0.3, wd);
        fx += wx * f;
        fy += wy * f;
        fz += wz * f;
      }
      const damp = Math.exp(-config.damping * dt);
      for (let k = 0; k < 3; k++) {
        const f = k === 0 ? fx : k === 1 ? fy : fz;
        this.velocities[j + k] = clamp(
          (this.velocities[j + k] + f * dt) * damp,
          -config.maxSpeed,
          config.maxSpeed,
        );
        this.positions[j + k] += this.velocities[j + k] * dt;
        if (
          !Number.isFinite(this.positions[j + k]) ||
          Math.abs(this.positions[j + k]) > 40
        ) {
          this.positions[j + k] = this.anchors[j + k];
          this.velocities[j + k] = 0;
        }
      }
    }
  }
}

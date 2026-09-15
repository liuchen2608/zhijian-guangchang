import { config } from "../config";
import {
  angle,
  clamp,
  distance,
  screenToWorld,
  validPoints,
} from "./coordinates";
import {
  neutral,
  type Control,
  type Mode,
  type TrackingFrame,
  type Vec3,
} from "./types";
export class GestureController {
  control = neutral();
  private lastTime = -1;
  private lastValid = -1;
  private candidate: Mode = "idle";
  private candidateSince = 0;
  private lastWave = -Infinity;
  private previous: Vec3 | null = null;
  private pinched = false;
  private scales: number[] = [];
  private reference = 0;
  private calibratedAt = 0;
  get calibrated() {
    return this.reference > 0;
  }
  reset() {
    this.control = neutral();
    this.lastTime = -1;
    this.lastValid = -1;
    this.previous = null;
    this.pinched = false;
    this.candidate = "idle";
    this.lastWave = -Infinity;
    this.recalibrate();
  }
  recalibrate() {
    this.reference = 0;
    this.scales = [];
    this.calibratedAt = 0;
  }
  update(frame: TrackingFrame, viewAspect: number, sensitivity = 1): Control {
    const { points: p, timestamp: t, width, height } = frame;
    if (!Number.isFinite(t) || t <= this.lastTime) return this.control;
    this.lastTime = t;
    if (!validPoints(p) || width <= 0 || height <= 0) return this.lost(t);
    const aspect = width / height,
      palm = distance(p[5], p[17], aspect);
    if (palm < 0.025) return this.lost(t);
    const dt =
        this.lastValid < 0
          ? 0.04
          : Math.max(0.001, (t - this.lastValid) / 1000),
      recovered = this.lastValid < 0 || t - this.lastValid > config.graceMs;
    this.lastValid = t;
    const ratio = distance(p[4], p[8], aspect) / palm;
    this.pinched =
      ratio < (this.pinched ? config.pinchExit : config.pinchEnter);
    const metric = p.map((v) => ({ x: v.x * aspect, y: v.y, z: v.z * aspect }));
    const extended = [8, 12, 16, 20].map(
      (tip) =>
        angle(metric[tip - 3], metric[tip - 2], metric[tip]) >
          config.extensionAngle &&
        distance(p[tip], p[0], aspect) >
          distance(p[tip - 2], p[0], aspect) * 1.1,
    );
    const thumb =
      angle(metric[1], metric[2], metric[4]) > 2.2 &&
      distance(p[4], p[5], aspect) > palm * 0.5;
    const next: Mode = this.pinched
      ? "attract"
      : extended.every(Boolean) && thumb
        ? "scatter"
        : extended[0]
          ? "follow"
          : "idle";
    if (next !== this.candidate) {
      this.candidate = next;
      this.candidateSince = t;
    }
    if (t - this.candidateSince >= config.holdMs) this.control.mode = next;
    let center = p[8];
    if (this.control.mode === "attract")
      center = { x: (p[4].x + p[8].x) / 2, y: (p[4].y + p[8].y) / 2, z: 0 };
    if (this.control.mode === "scatter")
      center = { x: (p[0].x + p[9].x) / 2, y: (p[0].y + p[9].y) / 2, z: 0 };
    // Foreshortened palms are poor depth references. Only calibrate a flat open hand.
    const flat = Math.abs(p[5].z - p[17].z) * aspect < palm * 0.45;
    if (!this.reference && next === "scatter" && flat) {
      if (!this.calibratedAt) this.calibratedAt = t;
      this.scales.push(palm);
      if (t - this.calibratedAt >= 500) {
        this.scales.sort((a, b) => a - b);
        this.reference = this.scales[Math.floor(this.scales.length / 2)];
      }
    } else if (!this.reference) {
      this.scales = [];
      this.calibratedAt = 0;
    }
    const z =
      this.reference && flat
        ? clamp(
            Math.log(palm / this.reference) * 2,
            -config.depthRange,
            config.depthRange,
          )
        : this.control.target.z * 0.98;
    const target = screenToWorld(1 - center.x, center.y, viewAspect, z);
    const velocity =
      recovered || !this.previous
        ? { x: 0, y: 0, z: 0 }
        : {
            x: clamp((target.x - this.previous.x) / dt, -12, 12),
            y: clamp((target.y - this.previous.y) / dt, -12, 12),
            z: 0,
          };
    const speed =
      recovered || !this.previous
        ? 0
        : Math.hypot(velocity.x / (8 * viewAspect), velocity.y / 8) / palm;
    const alpha = 1 - Math.exp(-dt * 14 * sensitivity);
    for (const key of ["x", "y", "z"] as const)
      this.control.target[key] +=
        (target[key] - this.control.target[key]) * alpha;
    this.control.wave =
      this.control.mode === "follow" &&
      !this.pinched &&
      next === "follow" &&
      speed > config.waveSpeed &&
      t - this.lastWave >= config.waveCooldown
        ? clamp(speed / 8, 0.2, 1)
        : 0;
    if (this.control.wave) this.lastWave = t;
    this.previous = target;
    this.control.velocity = velocity;
    this.control.strength = this.control.mode === "idle" ? 0 : 1;
    return this.control;
  }
  lost(t: number) {
    this.control.wave = 0;
    const age = this.lastValid < 0 ? Infinity : t - this.lastValid;
    this.control.strength = clamp(
      1 - (age - config.graceMs) / config.fadeMs,
      0,
      1,
    );
    if (age > config.graceMs) {
      this.previous = null;
      this.pinched = false;
      this.candidate = "idle";
      this.candidateSince = t;
    }
    if (this.control.strength === 0) this.control.mode = "idle";
    return this.control;
  }
}

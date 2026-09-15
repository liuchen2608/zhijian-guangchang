import type { Vec3 } from "./types";
export const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
export function distance(a: Vec3, b: Vec3, aspect = 1) {
  return Math.hypot((a.x - b.x) * aspect, a.y - b.y);
}
export function screenToWorld(
  x: number,
  y: number,
  aspect: number,
  z = 0,
): Vec3 {
  return {
    x: (clamp(x, 0, 1) * 2 - 1) * 4 * aspect,
    y: (1 - clamp(y, 0, 1) * 2) * 4,
    z,
  };
}
export function validPoints(points: Vec3[]) {
  return (
    points.length === 21 &&
    points.every(
      (p) =>
        p &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        Number.isFinite(p.z) &&
        Math.abs(p.x) < 4 &&
        Math.abs(p.y) < 4 &&
        Math.abs(p.z) < 4,
    )
  );
}
export function angle(a: Vec3, b: Vec3, c: Vec3) {
  const u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z },
    v = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const d = Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z);
  return d < 1e-8
    ? 0
    : Math.acos(clamp((u.x * v.x + u.y * v.y + u.z * v.z) / d, -1, 1));
}

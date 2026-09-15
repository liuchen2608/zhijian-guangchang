export type Vec3 = { x: number; y: number; z: number };
export type Mode = "idle" | "follow" | "attract" | "scatter";
export type InputSource = "demo" | "mouse" | "camera";
export interface Control {
  mode: Mode;
  target: Vec3;
  strength: number;
  wave: number;
  velocity: Vec3;
}
export const neutral = (): Control => ({
  mode: "idle",
  target: { x: 0, y: 0, z: 0 },
  strength: 0,
  wave: 0,
  velocity: { x: 0, y: 0, z: 0 },
});
export interface TrackingFrame {
  timestamp: number;
  points: Vec3[];
  width: number;
  height: number;
}

import type { Vec3 } from "../interaction/types";
export type Request =
  | { type: "init"; session: number; model: string; wasm: string }
  | {
      type: "frame";
      session: number;
      id: number;
      timestamp: number;
      image: ImageBitmap;
    }
  | { type: "dispose"; session: number };
export type Response =
  | { type: "ready"; session: number; delegate: "GPU" | "CPU" }
  | {
      type: "result";
      session: number;
      id: number;
      timestamp: number;
      points: Vec3[];
      duration: number;
    }
  | { type: "error"; session: number; message: string };

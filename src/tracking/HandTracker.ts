import { asset, config } from "../config";
import { validPoints } from "../interaction/coordinates";
import type { Response, Request } from "./protocol";
export class HandTracker {
  private worker: Worker | null = null;
  private session = 0;
  private id = 0;
  private busy = false;
  private pendingId = -1;
  private sentAt = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private rejectInit: ((error: Error) => void) | null = null;
  delegate = "CPU";
  duration = 0;
  age = 0;
  constructor(
    private result: (result: Extract<Response, { type: "result" }>) => void,
    private error: (code: string) => void,
  ) {}
  async initialize() {
    this.dispose();
    const current = this.session;
    const worker = new Worker(asset("tracking-worker.js"));
    this.worker = worker;
    return new Promise<void>((resolve, reject) => {
      this.rejectInit = reject;
      this.timer = setTimeout(() => {
        this.dispose();
        this.error("MODEL_INIT_TIMEOUT");
      }, config.initTimeout);
      worker.onmessage = ({ data }: MessageEvent<Response>) => {
        if (!data || data.session !== this.session || current !== this.session)
          return;
        if (data.type === "ready") {
          clearTimeout(this.timer);
          this.rejectInit = null;
          this.delegate = data.delegate;
          resolve();
        } else if (data.type === "error") {
          const code = data.message;
          this.dispose();
          this.error(code);
        } else if (data.type === "result") {
          if (!this.busy || data.id !== this.pendingId) return;
          clearTimeout(this.timer);
          this.busy = false;
          this.age = performance.now() - data.timestamp;
          this.duration = data.duration;
          if (
            !Number.isFinite(data.timestamp) ||
            this.age < 0 ||
            !Array.isArray(data.points) ||
            this.age > config.graceMs ||
            (!validPoints(data.points) && data.points.length !== 0) ||
            !Number.isFinite(data.duration)
          )
            return;
          this.result(data);
        }
      };
      worker.onerror = () => {
        this.dispose();
        this.error("TRACKER_FAILED");
      };
      const message: Request = {
        type: "init",
        session: current,
        model: asset("models/hand_landmarker.task"),
        wasm: asset("wasm"),
      };
      worker.postMessage(message);
    });
  }
  async submit(video: HTMLVideoElement, t: number) {
    if (
      this.busy ||
      !this.worker ||
      video.readyState < 2 ||
      t - this.sentAt <
        1000 / (this.delegate === "GPU" ? config.detectionHz : config.cpuHz)
    )
      return;
    this.busy = true;
    this.sentAt = t;
    const current = this.session,
      worker = this.worker;
    this.pendingId = ++this.id;
    this.timer = setTimeout(() => {
      this.dispose();
      this.error("FRAME_TIMEOUT");
    }, config.frameTimeout);
    try {
      const bitmap = await createImageBitmap(video);
      if (current !== this.session || worker !== this.worker) {
        bitmap.close();
        return;
      }
      const message: Request = {
        type: "frame",
        session: current,
        id: this.pendingId,
        timestamp: t,
        image: bitmap,
      };
      try {
        worker.postMessage(message, [bitmap]);
      } catch (error) {
        bitmap.close();
        throw error;
      }
    } catch {
      if (current === this.session) {
        this.dispose();
        this.error("TRACKER_FAILED");
      }
    }
  }
  dispose() {
    this.session++;
    clearTimeout(this.timer);
    this.rejectInit?.(new Error("识别会话已停止"));
    this.rejectInit = null;
    this.worker?.terminate();
    this.worker = null;
    this.busy = false;
  }
}

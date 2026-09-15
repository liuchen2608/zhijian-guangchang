import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import type { Request, Response } from "./protocol";
let model: HandLandmarker | null = null;
let session = -1;
const send = (message: Response) => self.postMessage(message);
self.onmessage = async ({ data }: MessageEvent<Request>) => {
  if (data.type === "init") {
    session = data.session;
    const current = session;
    try {
      const vision = await FilesetResolver.forVisionTasks(data.wasm);
      // CPU/WASM keeps inference independent of the graphics driver used by the stage.
      const delegate = "CPU";
      const instance = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: data.model, delegate },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      if (session !== current) {
        instance.close();
        return;
      }
      model = instance;
      send({ type: "ready", session, delegate });
    } catch {
      send({ type: "error", session: current, message: "MODEL_LOAD_FAILED" });
    }
  } else if (data.type === "dispose") {
    session = -1;
    model?.close();
    model = null;
    self.close();
  } else {
    try {
      if (data.session !== session || !model) return;
      const start = performance.now();
      const result = model.detectForVideo(data.image, data.timestamp);
      send({
        type: "result",
        session,
        id: data.id,
        timestamp: data.timestamp,
        points: result.landmarks[0] ?? [],
        duration: performance.now() - start,
      });
    } catch {
      send({ type: "error", session: data.session, message: "TRACKER_FAILED" });
    } finally {
      data.image.close();
    }
  }
};

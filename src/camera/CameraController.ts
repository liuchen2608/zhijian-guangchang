export class CameraController {
  private generation = 0;
  stream: MediaStream | null = null;
  async start(video: HTMLVideoElement) {
    this.stop();
    const generation = this.generation;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      throw new DOMException("已取消", "AbortError");
    }
    this.stream = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (error) {
      stream.getTracks().forEach((t) => t.stop());
      if (this.stream === stream) this.stream = null;
      throw error;
    }
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      throw new DOMException("已取消", "AbortError");
    }
    return stream;
  }
  stop() {
    this.generation++;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

export function checkCameraEnvironment() {
  if (window.isSecureContext === false) {
    throw new DOMException("摄像头需要安全连接", "CAMERA_INSECURE_CONTEXT");
  }
  const policyDocument = document as Document & {
    permissionsPolicy?: { allowsFeature(name: string): boolean };
    featurePolicy?: { allowsFeature(name: string): boolean };
  };
  const policy =
    policyDocument.permissionsPolicy ?? policyDocument.featurePolicy;
  if (policy && !policy.allowsFeature("camera")) {
    throw new DOMException("页面禁止摄像头", "CAMERA_POLICY_BLOCKED");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("浏览器不支持摄像头", "CAMERA_UNSUPPORTED");
  }
}

export class CameraController {
  private generation = 0;
  stream: MediaStream | null = null;
  async start(video: HTMLVideoElement) {
    this.stop();
    checkCameraEnvironment();
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
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        throw new DOMException(
          "视频播放被浏览器阻止",
          "CAMERA_PLAYBACK_BLOCKED",
        );
      }
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

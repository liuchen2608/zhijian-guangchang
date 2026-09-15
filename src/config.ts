export const config = {
  pinchEnter: 0.25,
  pinchExit: 0.35,
  holdMs: 100,
  graceMs: 250,
  fadeMs: 500,
  waveCooldown: 150,
  waveSpeed: 1.2,
  initTimeout: 20000,
  frameTimeout: 2000,
  particles: 8000,
  lowParticles: 4000,
  detectionHz: 25,
  cpuHz: 15,
  maxStep: 0.033,
  maxSpeed: 9,
  spring: 1.7,
  damping: 1.8,
  depthRange: 1.6,
  extensionAngle: 2.5,
};
export const asset = (path: string) =>
  new URL(`${import.meta.env.BASE_URL}${path}`, location.origin).href;

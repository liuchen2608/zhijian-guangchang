import { describe, it, expect, vi, afterEach } from "vitest";
import { ParticleField } from "../../src/particles/ParticleField";
import { neutral, type Vec3 } from "../../src/interaction/types";
import { GestureController } from "../../src/interaction/gestures";
import { screenToWorld, validPoints } from "../../src/interaction/coordinates";
import { CameraController } from "../../src/camera/CameraController";
import { SettingsStore } from "../../src/settings/store";
const openHand = (): Vec3[] =>
  [
    [0.5, 0.85, 0],
    [0.35, 0.72, 0],
    [0.26, 0.6, 0],
    [0.18, 0.51, 0],
    [0.1, 0.43, 0],
    [0.37, 0.6, 0],
    [0.37, 0.43, 0],
    [0.37, 0.28, 0],
    [0.37, 0.15, 0],
    [0.49, 0.57, 0],
    [0.49, 0.37, 0],
    [0.49, 0.22, 0],
    [0.49, 0.08, 0],
    [0.61, 0.59, 0],
    [0.61, 0.42, 0],
    [0.61, 0.3, 0],
    [0.61, 0.18, 0],
    [0.73, 0.64, 0],
    [0.73, 0.51, 0],
    [0.73, 0.41, 0],
    [0.73, 0.32, 0],
  ].map(([x, y, z]) => ({ x, y, z }));
function feed(g: GestureController, p: Vec3[], t: number) {
  return g.update({ points: p, timestamp: t, width: 640, height: 480 }, 16 / 9);
}
function radius(f: ParticleField) {
  let s = 0;
  for (let i = 0; i < f.count; i++)
    s += Math.hypot(...f.positions.slice(i * 3, i * 3 + 3));
  return s / f.count;
}
afterEach(() => vi.unstubAllGlobals());
describe("手势与坐标", () => {
  it("拒绝无效点位和非有限坐标", () => {
    expect(validPoints([])).toBe(false);
    const p = openHand();
    p[0].x = NaN;
    expect(validPoints(p)).toBe(false);
  });
  it("镜像由调用方恰好一次，屏幕中心映射原点", () => {
    expect(screenToWorld(0.5, 0.5, 1)).toEqual({ x: 0, y: 0, z: 0 });
    expect(screenToWorld(1 - 0.2, 0.5, 1).x).toBeGreaterThan(0);
  });
  it("张开五指经过稳定时间后分散并可校准", () => {
    const g = new GestureController();
    feed(g, openHand(), 1);
    expect(g.control.mode).toBe("idle");
    feed(g, openHand(), 120);
    expect(g.control.mode).toBe("scatter");
    feed(g, openHand(), 620);
    expect(g.calibrated).toBe(true);
    g.recalibrate();
    expect(g.calibrated).toBe(false);
  });
  it("捏合优先且进入退出有迟滞", () => {
    const g = new GestureController(),
      p = openHand();
    const pinch = (ratio: number) => {
      p[4] = { ...p[8], x: p[8].x + 0.36 * ratio };
      return p;
    };
    feed(g, pinch(0.2), 1);
    feed(g, pinch(0.2), 120);
    expect(g.control.mode).toBe("attract");
    feed(g, pinch(0.3), 240);
    expect(g.control.mode).toBe("attract");
    feed(g, pinch(0.5), 360);
    feed(g, pinch(0.5), 480);
    expect(g.control.mode).not.toBe("attract");
  });
  it("缩放不改变捏合分类", () => {
    const p = openHand();
    p[4] = { ...p[8], x: p[8].x + 0.05 };
    for (const scale of [0.6, 1, 1.4]) {
      const g = new GestureController();
      const q = p.map((v) => ({
        x: 0.5 + (v.x - 0.5) * scale,
        y: 0.5 + (v.y - 0.5) * scale,
        z: 0,
      }));
      feed(g, q, 1);
      feed(g, q, 150);
      expect(g.control.mode).toBe("attract");
    }
  });
  it("丢手时控制力衰减，重新识别不产生假波纹", () => {
    const g = new GestureController();
    feed(g, openHand(), 1);
    feed(g, openHand(), 120);
    expect(g.lost(400).strength).toBeLessThan(1);
    expect(g.lost(1000).mode).toBe("idle");
    feed(g, openHand(), 1200);
    expect(g.control.wave).toBe(0);
  });
  it("倒序时间戳与退化掌宽不污染控制", () => {
    const g = new GestureController();
    feed(g, openHand(), 100);
    feed(g, openHand(), 220);
    const p = openHand();
    p[8].x = 3;
    const before = { ...g.control.target };
    feed(g, p, 150);
    expect(g.control.target).toEqual(before);
    const zero = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    feed(g, zero, 2000);
    expect(g.control.strength).toBe(0);
  });
});
describe("粒子力场", () => {
  it("同种子初始化可复现", () =>
    expect(new ParticleField(50, 2).positions).toEqual(
      new ParticleField(50, 2).positions,
    ));
  it("聚合减小半径，分散增大半径", () => {
    const a = new ParticleField(400),
      s = new ParticleField(400),
      r = radius(a);
    for (let i = 0; i < 180; i++) {
      a.step(1 / 60, { ...neutral(), mode: "attract", strength: 1 });
      s.step(1 / 60, { ...neutral(), mode: "scatter", strength: 1 });
    }
    expect(radius(a)).toBeLessThan(r * 0.5);
    expect(radius(s)).toBeGreaterThan(r);
  });
  it("波纹改变轨迹且长期稳定", () => {
    const a = new ParticleField(50),
      b = new ParticleField(50);
    a.step(0.02, { ...neutral(), wave: 1 });
    b.step(0.02, neutral());
    for (let i = 0; i < 180; i++) {
      a.step(0.02, neutral());
      b.step(0.02, neutral());
    }
    expect(a.positions).not.toEqual(b.positions);
    for (const dt of [0, Infinity, NaN, 100, -10]) a.step(dt, neutral());
    expect([...a.positions].every(Number.isFinite)).toBe(true);
  });
});
describe("摄像头与设置", () => {
  it("关闭后迟到的摄像头授权不会泄漏轨道", async () => {
    let release!: (v: MediaStream) => void;
    const stop = vi.fn();
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("document", {});
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: () => new Promise<MediaStream>((r) => (release = r)),
      },
    });
    const c = new CameraController();
    const pending = c.start({ play: vi.fn() } as unknown as HTMLVideoElement);
    c.stop();
    release({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(stop).toHaveBeenCalledOnce();
  });
  it("坏 JSON 和被禁用的存储均安全回退", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "{broken",
      setItem: () => {
        throw Error();
      },
    });
    const s = new SettingsStore(),
      v = s.load();
    expect(v.quality).toBe("standard");
    expect(() => s.save(v)).not.toThrow();
    expect(s.warning).toContain("无法保存");
  });
  it("未知未来版本不覆盖原数据", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({ schemaVersion: 2 }),
      setItem,
    });
    const s = new SettingsStore();
    s.save(s.load());
    expect(setItem).not.toHaveBeenCalled();
  });
});

testLatePlay();
function testLatePlay() {
  it("旧会话迟到的 play 不会关闭新会话", async () => {
    const oldStop = vi.fn(),
      newStop = vi.fn();
    let finishPlay!: () => void;
    const oldStream = {
      getTracks: () => [{ stop: oldStop }],
    } as unknown as MediaStream;
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("document", {});
    const newStream = {
      getTracks: () => [{ stop: newStop }],
    } as unknown as MediaStream;
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockResolvedValueOnce(oldStream)
          .mockResolvedValueOnce(newStream),
      },
    });
    const c = new CameraController();
    const old = c.start({
      play: () => new Promise<void>((r) => (finishPlay = r)),
    } as unknown as HTMLVideoElement);
    await Promise.resolve();
    await c.start({ play: async () => {} } as unknown as HTMLVideoElement);
    finishPlay();
    await expect(old).rejects.toMatchObject({ name: "AbortError" });
    expect(newStop).not.toHaveBeenCalled();
    expect(c.stream).toBe(newStream);
    c.stop();
    expect(newStop).toHaveBeenCalledOnce();
  });
}

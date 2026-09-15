import { registerStudioTools } from "./ui/webmcp";
import { SceneRenderer } from "./rendering/SceneRenderer";
import { CameraController } from "./camera/CameraController";
import { HandTracker } from "./tracking/HandTracker";
import { GestureController } from "./interaction/gestures";
import { neutral, type InputSource, type Mode } from "./interaction/types";
import { screenToWorld } from "./interaction/coordinates";
import { SettingsStore } from "./settings/store";
import { drawSkeleton } from "./ui/preview";
export function startApp() {
  const root = document.querySelector<HTMLDivElement>("#app")!;
  root.innerHTML = `<main class="studio"><canvas id="stage" aria-label="交互式三维光束粒子舞台"></canvas><div class="ambient"></div>
 <header><a class="brand" href="./" aria-label="指尖光场首页"><span class="brand-mark">╱</span><span>LUMEN<span class="brand-cn">指尖光场</span></span></a><div class="top-center"><span class="tiny-dot"></span> 实时光场实验 <span class="sep">/</span> 01</div><button id="fullscreen" class="icon-button" aria-label="进入全屏" title="全屏">⛶</button></header>
 <section class="intro"><div class="eyebrow">LIGHT, AT YOUR FINGERTIPS</div><h1>让光，随你而动。</h1><p id="intro-text">伸出手指，牵引一束属于你的光。</p></section>
 <aside class="controls panel" aria-label="光场控制"><div class="panel-heading"><span>控制光场</span><span class="micro">LIVE</span></div><div class="source-tabs" aria-label="输入方式"><button id="source-camera" class="selected">摄像头</button><button id="source-mouse">鼠标演示</button></div><button id="camera-toggle" class="primary"><span>◎</span> 启用摄像头</button><p class="privacy">画面仅在本机处理，不录制、不上传</p><div class="divider"></div><label class="range-label" for="sensitivity">响应灵敏度 <output id="sensitivity-value">1.0×</output></label><input id="sensitivity" type="range" min="0.5" max="2" step="0.1" value="1"/><label class="range-label" for="quality">粒子精度</label><select id="quality"><option value="standard">标准 · 8,000 粒子</option><option value="low">轻量 · 4,000 粒子</option></select><button id="calibrate" class="secondary" disabled>重新校准纵深</button><p id="calibration-note" class="hint">张开手掌、正对镜头，建立空间参考</p><div class="divider"></div><div class="mode-heading"><span class="tiny-dot" id="status-dot"></span><span id="status" role="status" aria-live="polite">自动演示中</span></div><p id="status-detail" class="hint">点击启用，开始与光互动</p><p id="error" role="alert" hidden></p><details id="camera-help" class="hint" hidden><summary>摄像头权限恢复步骤</summary><ol><li>在 Chrome 或 Safari 中直接打开本页，避免聊天软件内嵌预览。</li><li>点击地址栏的网站设置，将摄像头改为“允许”。</li><li>Mac：系统设置 → 隐私与安全性 → 摄像头，允许当前浏览器。Windows：设置 → 隐私和安全性 → 摄像头，允许桌面应用访问。</li><li>修改系统权限后重启浏览器，再点击“启用摄像头”；也可先使用“鼠标演示”。</li></ol><a id="camera-open" target="_blank" rel="noopener noreferrer">在新标签页打开演示</a></details></aside>
 <div class="center-label" aria-hidden="true"><span class="cross">+</span><span>PARTICLE FIELD</span><span class="label-line"></span></div>
 <section class="preview panel" aria-label="摄像头预览"><div class="preview-heading"><span>你的手势</span><button id="preview-toggle" aria-expanded="true">收起</button></div><div id="preview-body"><div class="video-box"><video id="video" muted playsinline></video><canvas id="skeleton"></canvas><div id="preview-empty"><span class="hand-outline">✧</span><span>等待摄像头连接</span></div><span class="video-corner tl"></span><span class="video-corner br"></span></div><div class="preview-footer"><span class="tiny-dot"></span><span id="device-state">摄像头未开启</span></div></div></section>
 <div class="field-meta"><span id="gesture-label">自由流动</span><span class="field-coordinates" id="coordinates">X 0.00 · Y 0.00 · Z 0.00</span></div>
 <footer><nav class="gesture-guide" aria-label="手势操作说明"><button data-mode="follow"><span class="gesture-icon">↗</span><span>牵引<small>移动食指</small></span><kbd>1</kbd></button><button data-mode="attract"><span class="gesture-icon">◉</span><span>聚合<small>两指捏合</small></span><kbd>2</kbd></button><button data-mode="scatter"><span class="gesture-icon">✳</span><span>分散<small>张开五指</small></span><kbd>3</kbd></button><button data-mode="wave"><span class="gesture-icon">≈</span><span>波动<small>快速摆动</small></span><kbd>4</kbd></button></nav><div class="bottom-line"><span>探索光的另一种可能</span><details id="diagnostics"><summary><span id="fps">— FPS</span> <span class="micro">性能</span></summary><div class="diagnostic-panel panel" id="diagnostic-text">正在测量画面…</div></details><span class="micro">LOCAL VISION · 3D SPACE</span></div></footer>
 <div id="cursor" class="field-cursor" hidden></div><div id="toast" role="status" hidden></div></main>`;
  const $ = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const canvas = $<HTMLCanvasElement>("stage"),
    video = $<HTMLVideoElement>("video"),
    skeleton = $<HTMLCanvasElement>("skeleton");
  const store = new SettingsStore(),
    settings = store.load();
  const sensitivity = $<HTMLInputElement>("sensitivity"),
    quality = $<HTMLSelectElement>("quality");
  sensitivity.value = String(settings.sensitivity);
  quality.value = settings.quality;
  $("sensitivity-value").textContent = `${settings.sensitivity.toFixed(1)}×`;
  const camera = new CameraController(),
    gesture = new GestureController();
  let scene: SceneRenderer | null = null;
  let source: InputSource = "demo",
    active = false,
    starting = false,
    generation = 0,
    lastDetected = -Infinity,
    lastResult = -Infinity,
    raf = 0,
    lastTime = performance.now(),
    lastMetrics = lastTime,
    frames = 0,
    totalFrames = 0,
    totalSeconds = 0,
    wavePending = 0,
    mouseMode: Mode = "follow",
    pointerInside = false,
    lastMouse = 0;
  const mouse = neutral();
  let lostContext = false,
    disposed = false;
  const toast = (message: string) => {
    $("toast").textContent = message;
    $("toast").hidden = false;
    window.setTimeout(() => {
      $("toast").hidden = true;
    }, 4000);
  };
  const setStatus = (label: string, detail: string) => {
    $("status").textContent = label;
    $("status-detail").textContent = detail;
  };
  const modeNames: Record<Mode, string> = {
    idle: "自由流动",
    follow: "指尖牵引",
    attract: "光核聚合",
    scatter: "粒子分散",
  };
  const messages: Record<string, string> = {
    NotAllowedError:
      "摄像头未获授权。请检查网站权限和系统设置中的摄像头权限，再点击启用摄像头。",
    CAMERA_POLICY_BLOCKED:
      window.self !== window.top
        ? "内嵌预览的页面权限策略禁止摄像头。请在独立浏览器标签页打开演示，再允许摄像头。"
        : "当前页面权限策略禁止摄像头，单独修改网站授权无法解除。请暂用鼠标演示，并反馈此提示以检查托管配置。",
    CAMERA_INSECURE_CONTEXT:
      "当前连接不支持摄像头。请使用 HTTPS 演示链接，或在本机 localhost 打开。",
    CAMERA_UNSUPPORTED:
      "当前浏览器未提供摄像头接口，请在最新版 Chrome 或 Safari 中打开。",
    CAMERA_PLAYBACK_BLOCKED:
      "摄像头已获授权，但视频播放被浏览器阻止。请检查自动播放设置后重试。",
    NotFoundError: "没有找到摄像头，请连接设备后重试。",
    NotReadableError: "摄像头无法打开，可能正被其他应用占用。",
    MODEL_LOAD_FAILED: "识别模型加载失败，请检查本地模型资源后重试。",
    MODEL_INIT_TIMEOUT: "识别模型准备超时，请重试或使用鼠标演示。",
    TRACKER_FAILED: "手部识别中断，请重试或使用鼠标演示。",
    FRAME_TIMEOUT: "这一帧识别超时，已停止摄像头。请重试。",
    WEBGL_UNAVAILABLE:
      "浏览器无法创建 3D 画面。请启用硬件加速或更换支持 WebGL 的浏览器。",
    WEBGL_CONTEXT_LOST: "图形连接暂时中断，正在等待恢复。",
  };
  $<HTMLAnchorElement>("camera-open").href = window.location.href;
  function showError(code: string) {
    $("camera-help").hidden = !(
      code.startsWith("CAMERA_") ||
      ["NotAllowedError", "NotFoundError", "NotReadableError"].includes(code)
    );
    $("error").hidden = false;
    $("error").textContent =
      messages[code] ?? "设备暂时无法使用，请重试或切换鼠标演示。";
    $("error").dataset.code = code;
    setStatus("需要处理", code);
  }
  function updatePreview() {
    $("preview-body").hidden = !settings.previewVisible;
    $("preview-toggle").textContent = settings.previewVisible ? "收起" : "展开";
    $("preview-toggle").setAttribute(
      "aria-expanded",
      String(settings.previewVisible),
    );
  }
  function stop() {
    generation++;
    active = false;
    starting = false;
    camera.stop();
    tracker.dispose();
    video.srcObject = null;
    gesture.reset();
    drawSkeleton(skeleton, [], 640, 480);
    lastDetected = -Infinity;
    lastResult = -Infinity;
    wavePending = 0;
    $("camera-toggle").innerHTML = "<span>◎</span> 启用摄像头";
    $<HTMLButtonElement>("calibrate").disabled = true;
    $("preview-empty").hidden = false;
    $("device-state").textContent = "摄像头未开启";
    $("calibration-note").textContent = "张开手掌、正对镜头，建立空间参考";
    $("cursor").hidden = true;
  }
  const tracker = new HandTracker(
    (result) => {
      lastResult = result.timestamp;
      drawSkeleton(
        skeleton,
        result.points,
        video.videoWidth,
        video.videoHeight,
      );
      if (result.points.length) {
        lastDetected = result.timestamp;
        gesture.update(
          {
            points: result.points,
            timestamp: result.timestamp,
            width: video.videoWidth,
            height: video.videoHeight,
          },
          innerWidth / innerHeight,
          settings.sensitivity,
        );
        wavePending = Math.max(wavePending, gesture.control.wave);
        setStatus(
          "正在追踪",
          `${modeNames[gesture.control.mode]} · 移动手指探索光场`,
        );
        $("calibration-note").textContent = gesture.calibrated
          ? "空间参考已建立，可前后移动手掌"
          : "张开手掌、正对镜头保持片刻";
      } else {
        gesture.lost(result.timestamp);
        setStatus("等待手部", "把手伸入画面，保持光线充足");
      }
    },
    (code) => {
      if (disposed) return;
      stop();
      source = "demo";
      showError(code);
    },
  );
  async function startCamera() {
    if (active || starting) {
      stop();
      source = "demo";
      setStatus("摄像头已关闭", "点击启用，重新与光互动");
      return;
    }
    if (!scene || lostContext) {
      showError("WEBGL_UNAVAILABLE");
      return;
    }
    stop();
    const current = generation;
    source = "camera";
    starting = true;
    $("source-camera").classList.add("selected");
    $("source-mouse").classList.remove("selected");
    $("error").hidden = true;
    $("camera-help").hidden = true;
    $("camera-toggle").textContent = "取消启动";
    setStatus("等待授权", "请允许浏览器使用摄像头");
    try {
      const stream = await camera.start(video);
      if (current !== generation) return;
      setStatus("模型准备中", "首次启动需要准备本地识别模型");
      $("device-state").textContent = "摄像头已开启 · 模型准备中";
      $("preview-empty").hidden = true;
      for (const track of stream.getVideoTracks())
        track.addEventListener(
          "ended",
          () => {
            if (active) {
              stop();
              source = "demo";
              showError("NotReadableError");
            }
          },
          { once: true },
        );
      await tracker.initialize();
      if (current !== generation) return;
      starting = false;
      active = true;
      $("camera-toggle").innerHTML = "<span>◌</span> 关闭摄像头";
      $<HTMLButtonElement>("calibrate").disabled = false;
      $("device-state").textContent = "摄像头已开启 · 本地处理";
      setStatus("等待手部", "把手伸入画面，保持光线充足");
    } catch (error) {
      if (current !== generation) return;
      stop();
      source = "demo";
      showError(
        error instanceof DOMException ? error.name : "MODEL_LOAD_FAILED",
      );
    }
  }
  function selectMouse() {
    stop();
    source = "mouse";
    $("error").hidden = true;
    $("camera-help").hidden = true;
    $("source-camera").classList.remove("selected");
    $("source-mouse").classList.add("selected");
    setStatus("鼠标演示中", "在光场移动鼠标；按住聚合，使用下方按钮切换效果");
    $("intro-text").textContent = "移动鼠标探索，或开启摄像头用手掌控。";
  }
  function chooseMode(mode: string) {
    selectMouse();
    if (mode === "wave") {
      mouseMode = "follow";
      wavePending = 1;
    } else mouseMode = mode as Mode;
    mouse.mode = mouseMode;
    mouse.strength = 1;
  }
  $("camera-toggle").onclick = () => void startCamera();
  $("source-camera").onclick = () => {
    if (source === "mouse") {
      stop();
      source = "demo";
      $("source-camera").classList.add("selected");
      $("source-mouse").classList.remove("selected");
      setStatus("等待开启", "点击启用摄像头，开始与光互动");
      $("intro-text").textContent = "伸出手指，牵引一束属于你的光。";
    }
  };
  $("source-mouse").onclick = selectMouse;
  $("calibrate").onclick = () => {
    gesture.recalibrate();
    toast("请张开手掌、正对镜头保持片刻");
  };
  $("preview-toggle").onclick = () => {
    settings.previewVisible = !settings.previewVisible;
    updatePreview();
    store.save(settings);
  };
  updatePreview();
  sensitivity.oninput = () => {
    settings.sensitivity = Number(sensitivity.value);
    $("sensitivity-value").textContent = `${settings.sensitivity.toFixed(1)}×`;
    store.save(settings);
  };
  quality.onchange = () => {
    settings.quality = quality.value as "standard" | "low";
    scene?.setQuality(settings.quality);
    store.save(settings);
  };
  $("fullscreen").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast("当前浏览器无法进入全屏");
    }
  };
  root
    .querySelectorAll<HTMLButtonElement>("[data-mode]")
    .forEach((b) => (b.onclick = () => chooseMode(b.dataset.mode!)));
  canvas.addEventListener("pointermove", (e) => {
    pointerInside = true;
    if (source !== "mouse") return;
    const target = screenToWorld(
      e.clientX / innerWidth,
      e.clientY / innerHeight,
      innerWidth / innerHeight,
      mouse.target.z,
    );
    const now = performance.now(),
      dt = (now - lastMouse) / 1000;
    if (
      lastMouse &&
      dt > 0 &&
      Math.hypot(target.x - mouse.target.x, target.y - mouse.target.y) / dt >
        9 &&
      mouse.mode === "follow"
    )
      wavePending = 0.7;
    lastMouse = now;
    mouse.target = target;
    mouse.strength = 1;
    mouse.mode = e.buttons === 1 ? "attract" : mouseMode;
    $("cursor").hidden = false;
    $("cursor").style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (source === "mouse") {
      canvas.setPointerCapture(e.pointerId);
      mouse.mode = "attract";
      mouse.strength = 1;
    }
  });
  canvas.addEventListener("pointerup", () => {
    mouse.mode = mouseMode;
  });
  canvas.addEventListener("pointerleave", () => {
    pointerInside = false;
    $("cursor").hidden = true;
  });
  window.addEventListener("keydown", (e) => {
    if (
      (e.target as HTMLElement).matches("input,select,button") ||
      e.ctrlKey ||
      e.metaKey
    )
      return;
    const modes = ["follow", "attract", "scatter", "wave"];
    if ("1234".includes(e.key) && e.key.length === 1)
      chooseMode(modes[Number(e.key) - 1]);
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (source === "mouse") {
        e.preventDefault();
        mouse.target.z = Math.max(
          -1.6,
          Math.min(1.6, mouse.target.z - e.deltaY * 0.003),
        );
      }
    },
    { passive: false },
  );
  function resize() {
    scene?.resize(innerWidth, innerHeight);
  }
  window.addEventListener("resize", resize);
  function createScene() {
    try {
      scene = new SceneRenderer(canvas, settings.quality);
      resize();
    } catch {
      scene = null;
      showError("WEBGL_UNAVAILABLE");
    }
  }
  createScene();
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lostContext = true;
    stop();
    source = "demo";
    showError("WEBGL_CONTEXT_LOST");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    scene?.dispose();
    createScene();
    lostContext = false;
    if (scene) {
      $("error").hidden = true;
      $("camera-help").hidden = true;
      setStatus("画面已恢复", "可重新启用摄像头");
    }
  });
  document.addEventListener("visibilitychange", () => {
    lastTime = performance.now();
    lastMouse = 0;
    wavePending = 0;
    gesture.reset();
    if (active)
      setStatus(
        document.hidden ? "暂时暂停" : "等待手部",
        document.hidden ? "返回页面后恢复识别" : "请把手伸入画面",
      );
  });
  function tick(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const elapsed = (now - lastTime) / 1000;
    const dt = Math.min(elapsed, 0.033);
    lastTime = now;
    if (document.hidden || lostContext || !scene) return;
    if (active) {
      void tracker.submit(video, now);
      if (now - lastDetected > 250) gesture.lost(now);
      if (now - lastResult > 1000 && now - lastDetected > 1000)
        setStatus("等待手部", "把手伸入画面，保持光线充足");
    }
    const c =
      source === "camera"
        ? gesture.control
        : source === "mouse"
          ? mouse
          : neutral();
    c.wave = wavePending;
    wavePending = 0;
    scene.field.step(dt, c);
    c.wave = 0;
    scene.render(now / 1000);
    frames++;
    totalFrames++;
    totalSeconds += elapsed;
    if (now - lastMetrics > 500) {
      const fps = (frames * 1000) / (now - lastMetrics);
      $("fps").textContent = `${Math.round(fps)} FPS`;
      $("gesture-label").textContent = modeNames[c.mode];
      $("coordinates").textContent =
        `X ${c.target.x.toFixed(2)} · Y ${c.target.y.toFixed(2)} · Z ${c.target.z.toFixed(2)}`;
      $("diagnostic-text").textContent =
        `画面 ${Math.round(fps)} FPS · ${scene.field.count.toLocaleString()} 粒子\n识别 ${active ? tracker.delegate : "未启用"} · ${tracker.duration.toFixed(1)} ms\n结果年龄 ${active && Number.isFinite(lastResult) ? Math.round(now - lastResult) : "—"} ms\n平均绘制 ${Math.round(totalFrames / Math.max(0.1, totalSeconds))} FPS`;
      root
        .querySelectorAll<HTMLButtonElement>("[data-mode]")
        .forEach((b) =>
          b.classList.toggle("active", b.dataset.mode === c.mode),
        );
      frames = 0;
      lastMetrics = now;
    }
    if (source !== "mouse" || !pointerInside) $("cursor").hidden = true;
  }
  raf = requestAnimationFrame(tick);
  const unregisterTools = registerStudioTools(
    () => ({
      source,
      cameraActive: active,
      mode: source === "mouse" ? mouse.mode : gesture.control.mode,
      quality: settings.quality,
    }),
    chooseMode,
  );
  window.addEventListener(
    "pagehide",
    () => {
      unregisterTools();
      disposed = true;
      cancelAnimationFrame(raf);
      stop();
      scene?.dispose();
    },
    { once: true },
  );
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
  if (store.warning) toast(store.warning);
}

# 指尖光场 · LUMEN

用摄像头中的手指牵引、聚合、分散三维光束粒子，并触发扩散波纹。第一阶段为本地浏览器应用，模型和画面处理均在本机完成；无 API Key、登录或视频上传。

## 开始使用

已安装依赖的本机：

```bash
# 在项目目录打开终端
npm run dev
```

打开终端报告的地址，默认 **http://localhost:5180/**。点击「启用摄像头」并允许视频权限，把手伸入预览范围。若 5180 被占用，请选其他端口：`npm run dev -- --port 5182 --strictPort`，不要关闭其他项目进程。

新机器在项目目录执行：

```bash
npm ci
npm run prepare:assets
npm run dev
```

开发环境已验证 Node.js 24.19.0 / npm 11.17.0，Chrome 为主要验收浏览器。模型与 WASM 已附在 public；资源准备脚本检查/补齐它们。npm ci 需要网络；仅在模型缺失时下载 Google 官方模型。本地资源准备完成后，运行时无需云推理。不要直接双击 index.html。

## 如何控制

| 动作 | 效果 |
|---|---|
| 伸食指移动 | 牵引局部光束 |
| 拇指与食指捏合 | 聚拢成光核，保持捏合可拖动 |
| 张开五指 | 向外分散 |
| 伸食指快速摆动 | 触发传播和衰减的波纹 |
| 张开手掌正对摄像头约半秒 | 建立纵深参考，之后前后移动手掌调节相对纵深 |
| 手移出画面 | 控制力渐退，回到自由光流 |

相对纵深是手掌尺度映射，**不是精确测距**。侧转或遮挡会影响识别；重新正对镜头或点击「重新校准纵深」。

鼠标模式：点击「鼠标演示」，在舞台移动鼠标；按住左键聚合；底部按钮或键盘 1 / 2 / 3 / 4 分别选择牵引、聚合、分散、波动；滚轮调节纵深。点击底部效果按钮会切换到鼠标模式并关闭摄像头。

「收起预览」只隐藏画面；**「关闭摄像头」才会释放设备**。切换鼠标模式、离开页面也会停止视频轨道。后台标签页暂停推理；刷新不自动开启摄像头。

## 实现与适配

- Vite + TypeScript + Three.js；批量绘制 8,000 粒子，轻量档 4,000。
- MediaPipe Hand Landmarker 0.10.32，单手 VIDEO 模式，经典 Worker 中 CPU/WASM 推理，初始约 15 次/秒；3D 渲染仍用 GPU。
- **Worker 兼容修复**：MediaPipe 0.10.32 的 WASM 加载使用 importScripts，模块 Worker 会报 `self.import is not a function`。`scripts/build-worker.mjs` 用 esbuild 打包为独立经典 Worker，dev/build 前自动生成，保证两个环境一致。修改 tracking 源码后运行 `npm run build:worker` 并刷新页面。
- CPU/WASM 是第一阶段经加载测试验证的路径。软件图形环境中的 GPU 模型初始化曾卡住，故先保证识别与绘制互不依赖；GPU 推理留待真机性能有明确收益时重新评估。
- 手势状态机、归一化、迟滞、防抖与力场规则分别可独立测试；位置与每帧时间步限幅。
- localStorage 仅保存质量、灵敏度与预览偏好，版本校验、坏数据回默认；没有视频、关键点轨迹持久化。
- 模型资源版本、来源和 SHA-256 见 `docs/model-assets.json`。公开构建约 31 MB，主要是模型与两个 WASM 变体。

## 验证命令

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run preview
```

`test:e2e` 使用本机 Google Chrome（Playwright channel: chrome），专用端口 5181，结束自动回收测试服务器。首次机器没有 Chrome 时先安装官方 Chrome。`npm run preview` 默认 http://localhost:4173/，用于验证正式构建。五分钟运行测试单独执行 `npm run test:perf`，写入 `docs/performance-sample.json`。

测试分层：

1. Vitest：手势边界、坐标、聚合/分散、波纹、异常时间步、设置损坏和摄像头竞争条件。
2. Playwright：鼠标交互、质量与设置恢复、权限失败、真实模型加载与合成视频帧处理。
3. 人工真机：本人手势各 10 次、遮挡与旋转、相对纵深、真实摄像头释放及动作到画面延迟。**合成视频没有手，不能代替实际手势验收。**

阶段结果见 `docs/第一阶段验收记录.md`；尚待验项目不能视为已通过。

## 遇到问题

- 摄像头未授权：Chrome 地址栏的站点权限中允许摄像头；Mac 如有系统限制，在系统设置的隐私与安全性中允许 Chrome 使用摄像头。
- 设备无法打开：检查其他会议/录像应用是否占用，关闭其摄像头后在本页重试。
- 模型加载失败：运行 `npm run prepare:assets`、`npm run build:worker`，刷新重试；检查 public/models 和 public/wasm 文件。
- 画面卡顿：改为「轻量」，关闭其他高负载应用；性能折叠区显示实际 FPS、推理耗时及结果年龄。
- 识别停止/超时：页面会关闭摄像头，点击重新开启；可先用鼠标演示。
- WebGL 不可用：检查 Chrome 硬件加速；图形上下文丢失会提示并等待恢复。

反馈时提供动作、错误码、浏览器版本、画质档和复现方式；无需上传个人摄像头录像。

## 目录与下一阶段

`src/camera` 管设备；`tracking` 管推理与帧调度；`interaction` 管坐标和规则；`particles` 管力场；`rendering` 管 Three.js；`settings` 管偏好；`ui` 管骨架；`app.ts` 连接生命周期与页面。

本轮开发第一阶段，不含公开部署、双手、声音、录像和多形态。通过真人核心交互验收后，再按前端手册完善后续视觉与交互。

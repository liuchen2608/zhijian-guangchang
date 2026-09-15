export interface Settings {
  schemaVersion: 1;
  quality: "standard" | "low";
  sensitivity: number;
  previewVisible: boolean;
}
const defaults = (): Settings => ({
  schemaVersion: 1,
  quality: "standard",
  sensitivity: 1,
  previewVisible: true,
});
export class SettingsStore {
  warning = "";
  private future = false;
  load(): Settings {
    try {
      const raw = localStorage.getItem("finger-light.settings");
      if (!raw) return defaults();
      const s = JSON.parse(raw);
      if (s.schemaVersion !== 1) {
        this.future = true;
        this.warning = "设置版本不同，已使用默认值";
        return defaults();
      }
      if (
        !["standard", "low"].includes(s.quality) ||
        !Number.isFinite(s.sensitivity) ||
        s.sensitivity < 0.5 ||
        s.sensitivity > 2 ||
        typeof s.previewVisible !== "boolean"
      )
        throw Error();
      return {
        schemaVersion: 1,
        quality: s.quality,
        sensitivity: s.sensitivity,
        previewVisible: s.previewVisible,
      };
    } catch {
      this.warning = "无法读取设置，已使用默认值";
      return defaults();
    }
  }
  save(s: Settings) {
    if (this.future) return;
    try {
      localStorage.setItem("finger-light.settings", JSON.stringify(s));
    } catch {
      this.warning = "设置无法保存，本次操作仍然有效";
    }
  }
}

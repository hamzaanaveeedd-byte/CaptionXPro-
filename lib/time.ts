export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatClock(seconds: number, srt = false) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(safe * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const sec = totalSeconds % 60;
  const min = Math.floor(totalSeconds / 60) % 60;
  const hr = Math.floor(totalSeconds / 3600);
  const sep = srt ? "," : ".";
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}${sep}${String(ms).padStart(3, "0")}`;
}

export function parseClock(value: string) {
  const cleaned = value.trim().replace(",", ".");
  const parts = cleaned.split(":");
  if (parts.length !== 3) return NaN;
  const [h, m, s] = parts.map(Number);
  if (![h, m, s].every(Number.isFinite) || h < 0 || m < 0 || m >= 60 || s < 0 || s >= 60) return NaN;
  return h * 3600 + m * 60 + s;
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

function shortSha(): string {
  const env = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF;
  if (env) return env.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

function buildTime(): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

export default defineConfig({
  plugins: [react()],
  base: "./",
  define: {
    __BUILD_INFO__: JSON.stringify({
      time: buildTime(),
      sha: shortSha(),
      repo: process.env.GITHUB_REPOSITORY || "praswna/whats-it-called",
    }),
  },
});

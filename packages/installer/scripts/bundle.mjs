// Populate the publishable package from the repo: copy the static export
// (repo `out/`) into `web/`, and the skill into `SKILL.md`. Run after
// `next build`. See root script `npm run build:installer`.

import { cp, rm, copyFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // packages/installer/scripts
const pkg = join(here, "..");                          // packages/installer
const repo = join(here, "..", "..", "..");             // repo root

const OUT = join(repo, "out");
const SKILL = join(repo, "skill", "SKILL.md");
const WEB = join(pkg, "web");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(OUT))) {
  console.error(`✗ 找不到 ${OUT}。先在仓库根运行 \`npm run build\`（静态导出）。`);
  process.exit(1);
}
if (!(await exists(SKILL))) {
  console.error(`✗ 找不到 ${SKILL}。`);
  process.exit(1);
}

await rm(WEB, { recursive: true, force: true });
await cp(OUT, WEB, { recursive: true });
await copyFile(SKILL, join(pkg, "SKILL.md"));

console.log(`✓ 已打包：web/ ← out/，SKILL.md ← skill/SKILL.md`);

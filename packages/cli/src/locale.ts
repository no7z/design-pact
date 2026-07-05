// CLI-side language pick, mirroring the web app's tr(en, zh) convention.
// The CLI has no persisted preference, so detect once from the environment
// (LANG / LC_ALL / LC_MESSAGES, e.g. "zh_CN.UTF-8"). English is the default,
// same as the web app.

const envLang = (
  process.env.LC_ALL ||
  process.env.LC_MESSAGES ||
  process.env.LANG ||
  ""
).toLowerCase();

export const isZh: boolean = envLang.startsWith("zh");

export function t(en: string, zh: string): string {
  return isZh ? zh : en;
}

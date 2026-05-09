/**
 * Lightweight i18n utility for the WP React UI shell.
 * Translates based on the WP locale injected by PHP (e.g. "de_DE", "de_AT").
 * Falls back to English (key) when no translation exists.
 */

type Vars = Record<string, string | number>;

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/* ── Lazy-loaded German dictionary ───────────────────────────────────────── */
const DE_DICT_KEY = "__wp_react_ui_de_dict";

function getDeDict(): Record<string, string> | null {
  try {
    return (globalThis as Record<string, unknown>)[DE_DICT_KEY] as Record<string, string> | null ?? null;
  } catch {
    return null;
  }
}

function setDeDict(dict: Record<string, string>) {
  try {
    (globalThis as Record<string, unknown>)[DE_DICT_KEY] = dict;
  } catch {
    // Non-DOM environment — ignore.
  }
}

let deDictPromise: Promise<void> | null = null;

function ensureDeDictLoaded(): Promise<void> {
  if (getDeDict()) return Promise.resolve();
  if (!deDictPromise) {
    deDictPromise = import("./i18n/de")
      .then((m) => {
        setDeDict(m.de);
      })
      .catch(() => {});
  }
  return deDictPromise;
}

/**
 * Pre-loads the German dictionary for tests or eager scenarios.
 * Returns a promise that resolves once the import is complete.
 */
export function preloadDeDict(): Promise<void> {
  return ensureDeDictLoaded();
}

/* ── Translation function factory ─────────────────────────────────────────── */
export function createT(locale: string) {
  const isDE = locale.startsWith("de");
  if (isDE) {
    void ensureDeDictLoaded();
  }
  return function t(key: string, vars?: Vars): string {
    const dict = isDE ? getDeDict() : null;
    const template = dict ? (dict[key] ?? key) : key;
    return interpolate(template, vars);
  };
}

/** Translates a locale code to an Intl-compatible BCP 47 tag (e.g. "de_DE" → "de-DE"). */
export function localeToIntl(locale: string): string {
  return locale.replace("_", "-");
}

/** Returns a locale-aware short weekday name for a date string. */
export function localDayLabel(dateStr: string, intlLocale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(intlLocale, { weekday: "short" });
  } catch {
    return dateStr.slice(0, 3);
  }
}

/** Returns a locale-aware country name from a 2-letter code. */
export function localCountryName(code: string, intlLocale: string): string {
  try {
    return new Intl.DisplayNames([intlLocale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

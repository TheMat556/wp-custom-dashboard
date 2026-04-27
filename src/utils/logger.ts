/**
 * Thin logging wrapper.
 *
 * All calls are guarded by a NODE_ENV check so they compile to dead code in
 * production. The primary stripping mechanism is the esbuild `drop: ['console']`
 * option in vite.config.ts, which removes every console.* call at build time.
 */
export const logger = {
  debug: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== "production") console.debug(...args);
  },

  warn: (msg: string, ...details: unknown[]): void => {
    if (process.env.NODE_ENV !== "production") console.warn(msg, ...details);
  },

  error: (msg: string, ...details: unknown[]): void => {
    console.error(msg, ...details);
  },
};

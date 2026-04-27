import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react() as any],

  // Strip all console.* calls and debugger statements from production bundles.
  // This prevents internal state, store shapes, and error traces from leaking
  // to anyone with browser devtools open.
  oxc: {
    drop: mode === "production" ? (["console.debug", "console.log", "console.warn", "debugger"] as const) : [],
  },

  publicDir: "public",

  build: {
    outDir: "dist",
    manifest: true,
    target: "es2020",
    minify: "esbuild",
    cssMinify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      input: {
        embedBridge: resolve(__dirname, "src/embedBridge.ts"),
        main: resolve(__dirname, "src/main.tsx"),
        outside: resolve(__dirname, "src/outside.css"),
      },

      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",

        manualChunks(id) {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/scheduler")
          ) {
            return "react";
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },

  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost/wp-admin/admin.php",
      },
    },
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.test.*",
        "src/**/*.spec.*",
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/types/**",
      ],
    },
  },
}));

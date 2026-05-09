import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react() as any],

  // Strip all console.* calls and debugger statements from production bundles.
  // This prevents internal state, store shapes, and error traces from leaking
  // to anyone with browser devtools open.
  esbuild: mode === "production" ? ({ drop: ["console", "debugger"] } as any) : undefined,

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
          if (!id.includes("node_modules")) return undefined;

          // React core — small, used everywhere, kept hot.
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react";
          }
          // Antd icons — large but tree-shakable; isolate so a stylesheet edit
          // doesn't invalidate the whole vendor chunk.
          if (id.includes("@ant-design/icons")) {
            return "antd-icons";
          }
          // Antd itself + rc-* internals + dayjs (Antd's date dep).
          if (
            id.includes("/antd/") ||
            id.includes("/rc-") ||
            id.includes("/@rc-component/") ||
            id.includes("/dayjs/")
          ) {
            return "antd";
          }
          // Recharts is heavy and only used by the dashboard charts.
          if (
            id.includes("/recharts/") ||
            id.includes("/d3-") ||
            id.includes("/victory-vendor/")
          ) {
            return "charts";
          }
          // dnd-kit only matters in dashboard edit mode.
          if (id.includes("@dnd-kit/")) {
            return "dnd-kit";
          }
          // Everything else from node_modules — keep together to avoid an
          // explosion of tiny chunks.
          return "vendor";
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

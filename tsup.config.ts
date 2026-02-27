import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "fs";

function prependUseClient() {
  const files = ["dist/react.js", "dist/react.cjs"];
  for (const file of files) {
    try {
      const content = readFileSync(file, "utf8");
      if (!content.startsWith('"use client"')) {
        writeFileSync(file, `"use client";\n${content}`);
      }
    } catch {
      // File might not exist yet during first build step
    }
  }
}

export default defineConfig([
  // Core entry — no "use client" directive
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    treeshake: true,
    splitting: false,
    sourcemap: true,
  },
  // Schema/validation entry
  {
    entry: { schema: "src/schema.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
  },
  // React entry — "use client" for Next.js App Router
  {
    entry: { react: "src/react/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ["react"],
    onSuccess: async () => {
      prependUseClient();
    },
  },
  // Testing utilities entry
  {
    entry: { testing: "src/testing.tsx" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ["react"],
  },
  // Vue entry
  {
    entry: { vue: "src/vue/index.ts" },
    format: ["cjs", "esm"],
    dts: false,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ["vue"],
  },
  // SolidJS entry (signals-based bindings)
  {
    entry: { solid: "src/solid/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ["solid-js"],
  },
  // Preact entry (compat-based; re-exports React bindings)
  {
    entry: { preact: "src/preact/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    external: ["react", "preact", "preact/hooks", "preact/compat"],
  },
  // Web Components entry
  {
    entry: { "web-components": "src/web-components/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
  },
  // Angular-friendly service entry (signal-based)
  {
    entry: { angular: "src/angular/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
  },
  // Svelte entry (store-based helpers)
  {
    entry: { svelte: "src/svelte/index.ts" },
    format: ["cjs", "esm"],
    dts: false,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
  },
  // CLI entry — node command for changelog-as-code
  {
    entry: { featuredrop: "src/cli.ts" },
    format: ["cjs"],
    dts: false,
    clean: false,
    treeshake: true,
    splitting: false,
    sourcemap: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);

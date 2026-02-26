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
]);

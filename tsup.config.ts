import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "date-lib": "src/date-lib/index.ts",
    holidays: "src/holidays/index.ts",
    react: "src/react/index.tsx",
  },
  format: ["esm", "cjs"],
  dts: true,
  target: "es2022",
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Shared chunks in the CommonJS build too (ESM always splits). Without this, each .cjs entry carries
  // its own copy of the core, so require("nepali-day-picker") and require("nepali-day-picker/react")
  // load it twice, with two separate allowProjectedDates() switches.
  splitting: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react-day-picker"],
  // The React entry must be a client module in Next.js; the core must not be, so it can run in
  // Server Components. esbuild drops directives when bundling, so add it after the build.
  onSuccess: "node scripts/use-client.mjs",
});

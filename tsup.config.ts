import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", "date-lib": "src/date-lib/index.ts", react: "src/react/index.tsx" },
  format: ["esm", "cjs"],
  dts: true,
  target: "es2022",
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "react/jsx-runtime", "react-day-picker"],
  // The React entry must be a client module in Next.js; the core must not be, so it can run in
  // Server Components. esbuild drops directives when bundling, so add it after the build.
  onSuccess: "node scripts/use-client.mjs",
});

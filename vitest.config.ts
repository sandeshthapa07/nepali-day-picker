import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // RDP=10 or RDP=9.7 runs the suite against react-day-picker 10 or 9.7.0, installed under aliases.
      ...(process.env.RDP === "10" ? { "react-day-picker": path("./node_modules/react-day-picker-v10") } : {}),
      ...(process.env.RDP === "9.7" ? { "react-day-picker": path("./node_modules/react-day-picker-v9-7") } : {}),
      "nepali-day-picker/react": path("./src/react/index.tsx"),
      // shadcn's calendar.tsx imports these; the shadcn test uses small stand-ins.
      cn: path("./test/fixtures/stubs/cn.ts"),
      "lucide-react": path("./test/fixtures/stubs/lucide-react.tsx"),
      "@/registry/new-york-v4/ui/button": path("./test/fixtures/stubs/button.tsx"),
    },
  },
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
  },
});

// Adds "use client" to the React entry after tsup has built it.
import { readFileSync, writeFileSync } from "node:fs";

for (const file of ["dist/react.js", "dist/react.cjs"]) {
  const code = readFileSync(file, "utf8");
  if (!code.startsWith('"use client"'))
    writeFileSync(
      file,
      `"use client";
${code}`,
    );
}
console.log('Added "use client" to dist/react.js and dist/react.cjs');

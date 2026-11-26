// Checks that the package's entries stay separate after `npm run build`, in both the ESM and the
// CommonJS build:
// - the core (`nepali-day-picker`) loads no package at all, so no React and no react-day-picker;
// - the date library loads react-day-picker but not React;
// - the holiday data (data/holidays.json) stays out of the core and the date library;
// - the React entry shares the core's chunk instead of carrying its own copy.
// It prints what each entry loads, raw and brotli-compressed, so a size change is easy to spot.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { brotliCompressSync } from "node:zlib";

const ENTRIES = {
  index: { allowed: [], holidayData: false },
  "date-lib": { allowed: ["react-day-picker"], holidayData: false },
  holidays: { allowed: [], holidayData: true },
  react: { allowed: ["react", "react/jsx-runtime", "react-day-picker"], holidayData: true },
};
/** A string only the holiday data contains. */
const HOLIDAY_MARKER = "Ghatasthapana";
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*|\brequire\(\s*)["']([^"']+)["']/g;

/** Every dist file an entry loads, and the packages it imports. */
function graph(entry) {
  const files = new Set();
  const packages = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const [, spec] of readFileSync(file, "utf8").matchAll(SPECIFIER)) {
      if (spec.startsWith(".")) visit(join(dirname(file), spec));
      else packages.add(spec);
    }
  };
  visit(entry);
  return { files, packages };
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;
let failed = false;
const fail = (message) => {
  console.error(`✗ ${message}`);
  failed = true;
};

for (const ext of ["js", "cjs"]) {
  console.log(`\n${ext === "js" ? "ESM" : "CommonJS"} build`);
  const graphs = {};
  for (const [name, { allowed, holidayData }] of Object.entries(ENTRIES)) {
    const g = graph(join("dist", `${name}.${ext}`));
    graphs[name] = g;
    let raw = 0;
    let brotli = 0;
    let hasHolidays = false;
    for (const file of g.files) {
      const code = readFileSync(file);
      raw += code.length;
      brotli += brotliCompressSync(code).length;
      hasHolidays ||= code.includes(HOLIDAY_MARKER);
    }
    if (hasHolidays !== holidayData) {
      fail(`dist/${name}.${ext} ${holidayData ? "is missing" : "carries"} the holiday data`);
    }
    const loads = [...g.packages].join(", ") || "no packages";
    console.log(
      `  ${name.padEnd(9)} ${kb(raw).padStart(8)} raw ${kb(brotli).padStart(7)} brotli  ${g.files.size} file(s), ${loads}`,
    );
    for (const pkg of g.packages) {
      if (!allowed.includes(pkg)) fail(`dist/${name}.${ext} loads "${pkg}"`);
    }
  }
  const shared = [...graphs.index.files].filter((file) => graphs.react.files.has(file));
  if (shared.length === 0)
    fail(`dist/react.${ext} does not share a chunk with dist/index.${ext}; the core is duplicated`);
  const sharedHolidays = [...graphs.holidays.files].filter((file) => file !== join("dist", `holidays.${ext}`));
  if (!sharedHolidays.some((file) => graphs.react.files.has(file)))
    fail(`dist/react.${ext} does not share the holiday chunk with dist/holidays.${ext}`);
}

if (failed) process.exit(1);
console.log("\n✓ Entries are separate: no React or holiday data in the core, and shared chunks are reused.");

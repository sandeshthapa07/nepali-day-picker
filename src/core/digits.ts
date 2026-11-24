const NEPALI_DIGITS = "०१२३४५६७८९";
const NEPALI_ZERO = 0x0966;

/** Replaces ASCII digits 0-9 with Devanagari digits ०-९. Everything else is kept. */
export function toNepaliDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (c) => NEPALI_DIGITS[c.charCodeAt(0) - 48]);
}

/** Replaces Devanagari digits ०-९ with ASCII digits 0-9. Everything else is kept. */
export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - NEPALI_ZERO));
}

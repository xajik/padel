/** Join-code alphabet without ambiguous characters 0 O 1 I L (FR-4.1). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newJoinCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizeCode(input: string): string {
  const match = input.trim().toUpperCase().match(/([A-Z2-9]{6})\/?$/);
  return match ? match[1] : input.trim().toUpperCase();
}

export function isValidCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{6}$`).test(code);
}

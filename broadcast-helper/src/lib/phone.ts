/** Strips everything but digits from a country code like "+91" -> "91". */
export function cleanCountryCode(cc: string): string {
  return cc.replace(/\D/g, '');
}

/**
 * Converts a stored phone number into the digits-only international format WhatsApp's
 * deep link expects. Numbers without a country code get `countryCode` prepended.
 * Returns null when the number is too short to be a real phone number.
 */
export function toWhatsAppNumber(raw: string, countryCode: string): string | null {
  const cc = cleanCountryCode(countryCode);
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0')) {
    // trunk prefix (e.g. 098765 43210) -> national number
    digits = cc + digits.replace(/^0+/, '');
  } else if (digits.length <= 10) {
    digits = cc + digits;
  } else if (cc && digits.startsWith(cc)) {
    // e.g. 919876543210 stored without "+"
  } else {
    digits = cc + digits;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** Unique numbers of a contact (deduplicated by normalized form), preserving labels. */
export function uniquePhones(
  phones: { number?: string | null; label?: string | null }[] | undefined,
  countryCode: string,
): { number: string; label: string }[] {
  const seen = new Set<string>();
  const out: { number: string; label: string }[] = [];
  for (const p of phones ?? []) {
    if (!p.number) continue;
    const key = toWhatsAppNumber(p.number, countryCode) ?? p.number;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ number: p.number, label: p.label || 'phone' });
  }
  return out;
}

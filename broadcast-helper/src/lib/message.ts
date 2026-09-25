export const NAME_TOKEN = '{name}';
export const LONG_MESSAGE_CHARS = 1000;

/** Picks a first name from a contact's given name, falling back to the first word of the full name. */
export function firstNameOf(givenName: string | null | undefined, fullName: string | null | undefined): string | null {
  const given = givenName?.trim();
  if (given) return given.split(/\s+/)[0];
  const first = fullName?.trim().split(/\s+/)[0];
  // Ignore "names" that are really phone numbers
  if (first && /[\p{L}]/u.test(first)) return first;
  return null;
}

export function hasNameToken(message: string): boolean {
  return /\{name\}/i.test(message);
}

/**
 * Replaces {name} with the contact's first name. When there is no name, the placeholder is
 * removed cleanly so the recipient never sees a literal "{name}":
 *   "Hey {name}, see you"  -> "Hey, see you"
 *   "{name}, see you"      -> "see you"
 */
export function personalize(message: string, firstName: string | null | undefined): string {
  if (firstName) return message.replace(/\{name\}/gi, firstName);
  return message
    .replace(/(^|\n)[ \t]*\{name\}[ \t]*[,:;!-]?[ \t]*/gi, '$1')
    .replace(/[ \t]*\{name\}/gi, '');
}

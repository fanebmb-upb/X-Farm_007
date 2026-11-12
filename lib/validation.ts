// Shared input rules for every form and API route. React already escapes what it
// renders and Supabase sends values as query parameters, so these checks are a
// second layer: they reject markup and script-like input before it is stored.

// Letters in any language, digits, spaces, and punctuation that plant names,
// places, and Latin names need. Excludes < > { } [ ] " ` ; = \ and the like.
const SAFE_LABEL = /^[\p{L}\p{M}\p{N} .,'’()\-/&+#%°×:]*$/u;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/gu;
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** Normalises text: Unicode NFC, no control or invisible characters, single spaces, trimmed. */
export function cleanText(value: string) {
  return value.normalize("NFC").replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim();
}

export function isSafeLabel(value: string, { min = 0, max }: { min?: number; max: number }) {
  const text = cleanText(value);
  return text.length >= min && text.length <= max && SAFE_LABEL.test(text);
}

export function isValidEmail(value: string) {
  const email = value.trim();
  return email.length >= 6 && email.length <= 254 && EMAIL.test(email);
}

/** Free text such as chat messages may contain any punctuation; it is length-limited and stripped of control characters only. */
export function cleanFreeText(value: string, max: number) {
  return value.normalize("NFC").replace(CONTROL_CHARACTERS, " ").trim().slice(0, max);
}

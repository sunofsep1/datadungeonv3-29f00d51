/** Mirrors SQL `touch_text_signals_match` — high-intent language in touch notes. */
const TOUCH_INTENT_PATTERN =
  /\b(appraisal|evaluation|eval|appt|appointment)s?\b/i;

export function touchTextSignalsMatch(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return TOUCH_INTENT_PATTERN.test(text);
}

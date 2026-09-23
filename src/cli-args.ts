import { MemeError, type TextBox } from './spec.js';

/**
 * Parse repeatable --text values.
 * - `slot=content` targets a named slot; `\=` escapes a literal `=`.
 * - A numeric key maps to that index in the template's slot list.
 * - A value with no unescaped `=` is free-placement text.
 */
export function parseTextArgs(values: string[], slotNames: string[] = []): TextBox[] {
  return values.map((value) => {
    let eq = -1;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === '=' && value[i - 1] !== '\\') {
        eq = i;
        break;
      }
    }
    const unescape = (s: string): string => s.replace(/\\=/g, '=');
    if (eq === -1) return { text: unescape(value) };
    const key = value.slice(0, eq);
    const text = unescape(value.slice(eq + 1));
    if (/^\d+$/.test(key)) {
      const index = parseInt(key, 10);
      const slot = slotNames[index];
      if (slot === undefined) {
        throw new MemeError(
          'INVALID_SPEC',
          `--text index ${index} is out of range; template has ${slotNames.length} slot(s)${slotNames.length ? `: ${slotNames.join(', ')}` : ''}`,
          { index, available: slotNames },
        );
      }
      return { slot, text };
    }
    return { slot: unescape(key), text };
  });
}

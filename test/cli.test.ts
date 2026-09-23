import { describe, expect, it } from 'vitest';
import { parseTextArgs } from '../src/cli-args.js';
import { MemeError } from '../src/spec.js';

describe('parseTextArgs', () => {
  it('maps slot=content to named slots', () => {
    expect(parseTextArgs(['top=HELLO'])).toEqual([{ slot: 'top', text: 'HELLO' }]);
  });

  it('maps numeric keys to template slot indexes', () => {
    expect(parseTextArgs(['0=A', '1=B'], ['no', 'yes'])).toEqual([
      { slot: 'no', text: 'A' },
      { slot: 'yes', text: 'B' },
    ]);
  });

  it('rejects out-of-range numeric keys with INVALID_SPEC', () => {
    expect(() => parseTextArgs(['5=X'], ['no', 'yes'])).toThrowError(MemeError);
    try {
      parseTextArgs(['5=X'], ['no', 'yes']);
    } catch (err) {
      expect((err as MemeError).code).toBe('INVALID_SPEC');
    }
  });

  it('supports escaped literal = via \\=', () => {
    expect(parseTextArgs(['E\\=mc2'])).toEqual([{ text: 'E=mc2' }]);
    expect(parseTextArgs(['top=E\\=mc2'])).toEqual([{ slot: 'top', text: 'E=mc2' }]);
  });

  it('treats values without = as free-placement text', () => {
    expect(parseTextArgs(['JUST TEXT'])).toEqual([{ text: 'JUST TEXT' }]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  MemeError,
  parseMemeSpec,
  TemplateSelectionGuideSchema,
  TemplateSlotSchema,
} from '../src/spec.js';

describe('TemplateSelectionGuideSchema', () => {
  const valid = {
    description: 'Two panels contrast a stated promise with a disappointing result.',
    bestFor: ['a claim contradicted by actual behavior'],
    avoidWhen: ['the joke needs three independently labeled actors'],
    tone: ['critical', 'ironic'],
    mechanics: {
      visual: 'The second reaction reverses the emotional direction of the first.',
      text: 'Place the promise first and the contradictory result second.',
    },
  };

  it('accepts a complete strict guide', () => {
    expect(TemplateSelectionGuideSchema.parse(valid)).toEqual(valid);
  });

  it('rejects duplicate entries, invalid tone slugs, and unknown fields', () => {
    expect(() =>
      TemplateSelectionGuideSchema.parse({ ...valid, bestFor: ['duplicate', 'duplicate'] }),
    ).toThrow();
    expect(() => TemplateSelectionGuideSchema.parse({ ...valid, tone: ['not a slug'] })).toThrow();
    expect(() => TemplateSelectionGuideSchema.parse({ ...valid, extra: true })).toThrow();
  });
});

describe('parseMemeSpec', () => {
  it('accepts a minimal template spec', () => {
    const spec = parseMemeSpec({ base: { kind: 'template', id: 'drake' }, texts: [] });
    expect(spec.base.kind).toBe('template');
    expect(spec.output).toEqual({});
  });

  it('accepts canvas and layout bases', () => {
    expect(parseMemeSpec({ base: { kind: 'canvas', width: 100, height: 50 } }).texts).toEqual([]);
    const layout = parseMemeSpec({
      base: { kind: 'layout', grid: [2, 2], cells: [{ image: 'a.png' }] },
    });
    expect(layout.base.kind).toBe('layout');
  });

  it('accepts percent placement strings', () => {
    const spec = parseMemeSpec({
      base: { kind: 'canvas', width: 100, height: 100 },
      texts: [{ text: 'hi', x: '10%', y: '5%', width: '80%' }],
    });
    expect(spec.texts[0]?.x).toBe('10%');
  });

  it('rejects unknown base kinds with INVALID_SPEC', () => {
    try {
      parseMemeSpec({ base: { kind: 'video' }, texts: [] });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(MemeError);
      expect((err as MemeError).code).toBe('INVALID_SPEC');
    }
  });

  it('rejects bad style values', () => {
    expect(() =>
      parseMemeSpec({
        base: { kind: 'canvas', width: 10, height: 10 },
        texts: [{ text: 'x', style: { opacity: 2 } }],
      }),
    ).toThrowError(MemeError);
  });

  it('rejects invalid colors with INVALID_SPEC', () => {
    expect(() =>
      parseMemeSpec({
        base: { kind: 'canvas', width: 10, height: 10 },
        texts: [{ text: 'x', style: { color: '"/><image href="/etc/hostname"/>' } }],
      }),
    ).toThrowError(MemeError);
    expect(() =>
      parseMemeSpec({ base: { kind: 'canvas', width: 10, height: 10, color: 'url(evil)' } }),
    ).toThrowError(MemeError);
  });

  it('accepts hex, rgb(), and named colors', () => {
    const spec = parseMemeSpec({
      base: { kind: 'canvas', width: 10, height: 10, color: 'rgb(1, 2, 3)' },
      texts: [{ text: 'x', style: { color: '#ffd23f', stroke: 'black' } }],
    });
    expect(spec.base.kind).toBe('canvas');
  });

  it('rejects NaN and negative dimensions', () => {
    expect(() =>
      parseMemeSpec({
        base: { kind: 'canvas', width: 10, height: 10 },
        texts: [{ text: 'x', x: NaN }],
      }),
    ).toThrowError(MemeError);
    expect(() =>
      parseMemeSpec({
        base: { kind: 'canvas', width: 10, height: 10 },
        texts: [{ text: 'x', width: -5 }],
      }),
    ).toThrowError(MemeError);
  });

  it('exposes structured issues in error details', () => {
    try {
      parseMemeSpec({ base: { kind: 'template' } });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as MemeError).details).toHaveProperty('issues');
    }
  });

  it('rejects over-limit text with RESOURCE_LIMIT', () => {
    try {
      parseMemeSpec({
        base: { kind: 'canvas', width: 10, height: 10 },
        texts: [{ text: 'x'.repeat(3000) }],
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as MemeError).code).toBe('RESOURCE_LIMIT');
    }
  });

  it('accepts overwrite and onDegrade output options', () => {
    const spec = parseMemeSpec({
      base: { kind: 'canvas', width: 10, height: 10 },
      output: { overwrite: true, onDegrade: 'error' },
    });
    expect(spec.output.overwrite).toBe(true);
    expect(spec.output.onDegrade).toBe('error');
  });

  it('accepts per-text quality constraints', () => {
    const spec = parseMemeSpec({
      base: { kind: 'canvas', width: 300, height: 200 },
      texts: [
        {
          text: 'quality checked',
          constraints: { padding: 8, minFontSize: 24, maxLines: 2, maxTextCoverage: 0.6 },
        },
      ],
    });
    expect(spec.texts[0]?.constraints).toEqual({
      padding: 8,
      minFontSize: 24,
      maxLines: 2,
      maxTextCoverage: 0.6,
    });
  });

  it('accepts a template safe rect with default quality constraints', () => {
    const slot = TemplateSlotSchema.parse({
      name: 'caption',
      rect: [0, 0, 400, 200],
      safeRect: [20, 20, 360, 160],
      constraints: { padding: 10, minFontSize: 20, maxLines: 3, maxTextCoverage: 0.7 },
    });
    expect(slot.safeRect).toEqual([20, 20, 360, 160]);
  });

  it('rejects invalid text quality constraints', () => {
    expect(() =>
      parseMemeSpec({
        base: { kind: 'canvas', width: 100, height: 100 },
        texts: [{ text: 'x', constraints: { maxLines: 0 } }],
      }),
    ).toThrowError(MemeError);
    expect(() =>
      parseMemeSpec({
        base: { kind: 'canvas', width: 100, height: 100 },
        texts: [{ text: 'x', constraints: { maxTextCoverage: 1.1 } }],
      }),
    ).toThrowError(MemeError);
  });

  it('rejects unknown extra keys', () => {
    expect(() =>
      parseMemeSpec({ base: { kind: 'template', id: 'drake' }, texts: [], bogus: 1 }),
    ).toThrowError(MemeError);
  });
});

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { suggestTemplates } from '../src/suggest.js';

describe('suggestTemplates', () => {
  it('retrieves expectation-versus-reality candidates from catalog semantics', () => {
    const suggestions = suggestTemplates({
      query:
        'critical irony hypocrisy, public claim contradicted by actual behavior, two beat expectation reality, short parallel captions',
      limit: 5,
    });
    expect(suggestions[0]?.id).toBe('disappointed-black-guy');
    expect(suggestions[0]?.qualityReady).toBe(true);
    expect(suggestions[0]?.selectionGuide.source).toBe('curated');
    expect(suggestions[0]?.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'best-for' }),
        expect.objectContaining({ kind: 'quality' }),
      ]),
    );
    expect(Buffer.byteLength(JSON.stringify(suggestions), 'utf8')).toBeLessThan(8_000);
  });

  it('lets an explicitly named template override metadata retrieval', () => {
    const suggestions = suggestTemplates({
      query: 'Mocking SpongeBob sarcastic repetition',
      limit: 3,
    });
    expect(suggestions[0]?.id).toBe('mocking-spongebob');
    expect(suggestions[0]?.reasons[0]).toMatchObject({ kind: 'explicit', points: 1000 });
  });

  it('is deterministic, score-sorted, and respects limit and type', () => {
    const options = {
      query: 'ironic expectation reality two beat emotional reversal',
      limit: 3,
      type: 'image' as const,
    };
    const first = suggestTemplates(options);
    const second = suggestTemplates(options);
    expect(second).toEqual(first);
    expect(first).toHaveLength(3);
    expect(first.every((item) => item.type === 'image')).toBe(true);
    for (let i = 1; i < first.length; i++) {
      expect(first[i - 1]!.score).toBeGreaterThanOrEqual(first[i]!.score);
    }
  });

  it('lets the host LLM apply structural slot constraints', () => {
    const suggestions = suggestTemplates({
      query: 'anxious choice between incompatible alternatives',
      minSlots: 3,
      maxSlots: 3,
      limit: 10,
    });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((item) => item.slots.length === 3)).toBe(true);
  });

  it.each([
    {
      query: 'provocative assertive hot take public challenge debate one compact statement',
      minSlots: 1,
      maxSlots: 1,
      expected: 'change-my-mind',
    },
    {
      query: 'reject one option and prefer a better alternative two choice comparison',
      minSlots: 2,
      maxSlots: 2,
      expected: 'drake',
    },
    {
      query: 'anxious impossible tradeoff between two mutually exclusive costly options',
      minSlots: 3,
      maxSlots: 3,
      expected: 'two-buttons',
    },
    {
      query: 'mocking a quoted claim by repeating it as a sarcastic imitation',
      minSlots: 2,
      maxSlots: 2,
      expected: 'mocking-spongebob',
    },
  ])('retrieves $expected from its curated guide', ({ query, minSlots, maxSlots, expected }) => {
    expect(suggestTemplates({ query, minSlots, maxSlots, limit: 5 })[0]?.id).toBe(expected);
  });

  it('returns both strong self-inflicted-blame candidates for host comparison', () => {
    const ids = suggestTemplates({
      query: 'self caused problem followed by ironic blame after the consequence',
      minSlots: 2,
      maxSlots: 3,
      limit: 5,
    }).map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(['bike-fall', 'who-killed-hannibal']));
  });

  it('does not reinterpret a neutral benchmark query as sarcasm', () => {
    const suggestions = suggestTemplates({
      query: 'neutral benchmark performance report',
      limit: 5,
    });
    expect(suggestions[0]?.id).not.toBe('disappointed-black-guy');
  });

  it('does not treat avoidWhen text as a positive retrieval signal', () => {
    const dir = mkdtempSync(join(tmpdir(), 'meme-selection-catalog-'));
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({
        templates: [
          {
            id: 'avoid-only',
            name: 'Avoid Only',
            type: 'image',
            file: 'images/avoid-only.png',
            width: 100,
            height: 100,
            tags: [],
            slots: [{ name: 'caption', rect: [0, 0, 100, 100], hint: 'one short statement' }],
            selectionGuide: {
              description: 'A generic single-caption fixture used to verify retrieval behavior.',
              bestFor: ['a plain statement with no special visual relationship'],
              avoidWhen: ['the request is about a zeppelin'],
              tone: ['neutral'],
              mechanics: {
                visual: 'A generic image provides no semantic signal for the requested subject.',
                text: 'Use one short statement in the caption slot.',
              },
            },
          },
        ],
      }),
    );
    expect(suggestTemplates({ query: 'zeppelin', templatesDir: dir })).toEqual([]);
  });

  it('returns no arbitrary fallback for an unknown concept', () => {
    expect(suggestTemplates({ query: 'xyzzyplugh', limit: 5 })).toEqual([]);
  });
});

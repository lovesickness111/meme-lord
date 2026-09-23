import { describe, expect, it } from 'vitest';
import { listTemplates } from '../src/catalog.js';
import { TemplateSelectionGuideSchema, type Template } from '../src/spec.js';
import { resolveTemplateSelectionGuide } from '../src/template-guide.js';

const baseTemplate: Template = {
  id: 'test-template',
  name: 'Test Template',
  type: 'image',
  file: 'images/test.png',
  width: 800,
  height: 600,
  tags: ['comparison', 'irony'],
  category: 'comparison',
  slots: [
    { name: 'setup', rect: [0, 0, 400, 300], hint: 'the stated promise' },
    { name: 'punchline', rect: [0, 300, 400, 300], hint: 'the contradictory outcome' },
  ],
};

const curated = {
  description: 'Two visual beats contrast a confident promise with a contradictory outcome.',
  bestFor: ['a public claim contradicted by actual behavior'],
  avoidWhen: ['the joke has no meaningful contrast'],
  tone: ['critical', 'ironic'],
  mechanics: {
    visual: 'The second beat reverses the expectation established by the first beat.',
    text: 'Put the claim in setup and the contradictory result in punchline.',
  },
};

describe('template selection guides', () => {
  it('strictly validates curated semantic metadata', () => {
    expect(TemplateSelectionGuideSchema.parse(curated)).toEqual(curated);
    expect(() => TemplateSelectionGuideSchema.parse({ ...curated, tone: ['not valid'] })).toThrow();
    expect(() =>
      TemplateSelectionGuideSchema.parse({ ...curated, bestFor: ['same', 'same'] }),
    ).toThrow();
    expect(() => TemplateSelectionGuideSchema.parse({ ...curated, extra: true })).toThrow();
  });

  it('preserves curated guides and adds only runtime decision signals', () => {
    const template = { ...baseTemplate, selectionGuide: curated };
    const before = structuredClone(template);
    expect(resolveTemplateSelectionGuide(template)).toEqual({
      ...curated,
      source: 'curated',
      previewRecommended: true,
    });
    expect(template).toEqual(before);
  });

  it('derives an honest deterministic fallback from every slot hint', () => {
    const first = resolveTemplateSelectionGuide(baseTemplate);
    const second = resolveTemplateSelectionGuide(baseTemplate);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ source: 'derived', previewRecommended: true });
    expect(first.mechanics.text).toContain('setup → the stated promise');
    expect(first.mechanics.text).toContain('punchline → the contradictory outcome');
    expect(first.description).not.toContain(baseTemplate.file);
  });

  it('resolves a non-empty guide for the entire bundled catalog', () => {
    const guides = listTemplates().map(resolveTemplateSelectionGuide);
    expect(guides).toHaveLength(610);
    for (const guide of guides) {
      expect(guide.description.length).toBeGreaterThan(0);
      expect(guide.bestFor.length).toBeGreaterThan(0);
      expect(guide.tone.length).toBeGreaterThan(0);
      expect(guide.mechanics.visual.length).toBeGreaterThan(0);
      expect(guide.mechanics.text.length).toBeGreaterThan(0);
    }
  });
});

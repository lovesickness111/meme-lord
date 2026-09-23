import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { getTemplate, listTemplates, templateImagePath } from '../src/catalog.js';
import { MemeError } from '../src/spec.js';

describe('catalog', () => {
  it('lists at least 5 templates', () => {
    expect(listTemplates().length).toBeGreaterThanOrEqual(5);
  });

  it('filters by tag, type, and search', () => {
    expect(listTemplates({ tag: 'choice' }).every((t) => t.tags.includes('choice'))).toBe(true);
    expect(listTemplates({ type: 'image' }).every((t) => t.type === 'image')).toBe(true);
    expect(listTemplates({ search: 'drake' }).map((t) => t.id)).toContain('drake');
    expect(
      listTemplates({ search: 'public challenge awaiting rebuttal' }).map((t) => t.id),
    ).toContain('change-my-mind');
  });

  it('gets a template by id', () => {
    const drake = getTemplate('drake');
    expect(drake.slots.map((s) => s.name)).toEqual(['no', 'yes']);
    expect(drake.selectionGuide?.bestFor.length).toBeGreaterThan(0);
  });

  it('throws TEMPLATE_NOT_FOUND for unknown ids', () => {
    try {
      getTemplate('nope');
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as MemeError).code).toBe('TEMPLATE_NOT_FOUND');
    }
  });

  it('every template file exists and matches declared dimensions', async () => {
    for (const t of listTemplates()) {
      const path = templateImagePath(t);
      expect(existsSync(path), `${t.id}: missing file ${t.file}`).toBe(true);
      const meta = await sharp(path).metadata();
      expect(meta.width, `${t.id} width`).toBe(t.width);
      expect(meta.pageHeight ?? meta.height, `${t.id} height`).toBe(t.height);
      for (const slot of t.slots) {
        const [x, y, w, h] = slot.rect;
        expect(x + w, `${t.id}.${slot.name} exceeds width`).toBeLessThanOrEqual(t.width);
        expect(y + h, `${t.id}.${slot.name} exceeds height`).toBeLessThanOrEqual(t.height);
      }
    }
  });
});

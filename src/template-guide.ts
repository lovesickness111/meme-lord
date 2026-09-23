import type { Template } from './spec.js';

export interface ResolvedTemplateSelectionGuide {
  description: string;
  bestFor: string[];
  avoidWhen: string[];
  tone: string[];
  mechanics: {
    visual: string;
    text: string;
  };
  source: 'curated' | 'derived';
  previewRecommended: boolean;
}

const NOISY_TAGS = new Set([
  'character',
  'gif',
  'image',
  'meme',
  'panel',
  'reaction',
  'tech',
  'template',
  'work',
]);

const TONE_TAGS = new Set([
  'absurd',
  'celebratory',
  'confused',
  'critical',
  'deadpan',
  'disappointed',
  'dramatic',
  'frustrated',
  'hypocrisy',
  'irony',
  'mockery',
  'panicked',
  'sarcasm',
  'skeptical',
  'surprise',
  'wholesome',
]);

function words(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function qualityReady(template: Template): boolean {
  return (
    template.slots.length > 0 &&
    template.slots.every(
      (slot) =>
        slot.safeRect !== undefined &&
        slot.constraints !== undefined &&
        Object.keys(slot.constraints).length > 0,
    )
  );
}

/**
 * Resolve the semantic card shown to an agent. Curated template metadata wins;
 * older/custom catalogs still get an honest card derived from known facts.
 */
export function resolveTemplateSelectionGuide(template: Template): ResolvedTemplateSelectionGuide {
  const ready = qualityReady(template);
  if (template.selectionGuide) {
    return {
      description: template.selectionGuide.description,
      bestFor: [...template.selectionGuide.bestFor],
      avoidWhen: [...template.selectionGuide.avoidWhen],
      tone: [...template.selectionGuide.tone],
      mechanics: { ...template.selectionGuide.mechanics },
      source: 'curated',
      previewRecommended: !ready,
    };
  }

  const concepts = [...new Set([template.category, ...template.tags].filter(Boolean))]
    .map((item) => words(item!))
    .filter((item) => !NOISY_TAGS.has(item));
  const tones = concepts.filter((item) => TONE_TAGS.has(item));
  const slotPattern = template.slots.length
    ? template.slots
        .map((slot) => `${words(slot.name)} → ${slot.hint ?? `caption for ${words(slot.name)}`}`)
        .join('; ')
    : 'No named caption slots are defined.';
  const kind = template.type === 'gif' ? 'animated GIF' : 'static image';
  const avoidWhen = [
    `the joke needs more than ${String(template.slots.length)} independently labeled ideas`,
  ];
  if (template.type === 'gif') avoidWhen.push('the delivery must be a static image');
  if (!ready) avoidWhen.push('the template cannot be previewed or preflighted before delivery');

  return {
    description: `${template.name} is a ${kind} with ${String(template.slots.length)} named caption region${template.slots.length === 1 ? '' : 's'}; its visual premise has not yet been manually curated.`,
    bestFor: concepts.length
      ? concepts
      : [`a joke that matches the visual premise of ${template.name}`],
    avoidWhen,
    tone: tones.length ? tones : ['context-dependent'],
    mechanics: {
      visual: `Preview the ${kind} to verify that its visual premise matches the intended joke.`,
      text: slotPattern,
    },
    source: 'derived',
    previewRecommended: true,
  };
}

export function templateSelectionText(template: Template): string {
  const guide = resolveTemplateSelectionGuide(template);
  return [
    template.id,
    template.name,
    template.category,
    ...template.tags,
    guide.description,
    ...guide.bestFor,
    ...guide.tone,
    guide.mechanics.visual,
    guide.mechanics.text,
    ...template.slots.flatMap((slot) => [slot.name, slot.hint]),
  ]
    .filter(Boolean)
    .join(' ');
}

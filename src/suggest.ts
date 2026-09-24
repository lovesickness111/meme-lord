import { listTemplates } from './catalog.js';
import { MemeError, type Template } from './spec.js';
import {
  resolveTemplateSelectionGuide,
  type ResolvedTemplateSelectionGuide,
} from './template-guide.js';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'versus',
  'with',
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

function addReason(reasons: TemplateSuggestionReason[], reason: TemplateSuggestionReason): void {
  if (!reasons.some((item) => item.kind === reason.kind && item.term === reason.term)) {
    reasons.push(reason);
  }
}

export interface SuggestTemplatesOptions {
  /**
   * A retrieval brief prepared by the host LLM. It should describe the humor
   * mechanic, tone, visual relationship, number of beats, and caption shape.
   */
  query: string;
  limit?: number;
  type?: 'image' | 'gif';
  templatesDir?: string;
  minSlots?: number;
  maxSlots?: number;
}

export interface TemplateSuggestion {
  id: string;
  name: string;
  type: 'image' | 'gif';
  width: number;
  height: number;
  category?: string;
  tags: string[];
  slots: { name: string; hint?: string }[];
  selectionGuide: ResolvedTemplateSelectionGuide;
  score: number;
  reasons: TemplateSuggestionReason[];
  qualityReady: boolean;
}

export interface TemplateSuggestionReason {
  kind:
    | 'explicit'
    | 'name'
    | 'tag'
    | 'category'
    | 'description'
    | 'best-for'
    | 'tone'
    | 'mechanics'
    | 'slot'
    | 'quality';
  term: string;
  points: number;
}

type MatchKind = Exclude<TemplateSuggestionReason['kind'], 'explicit' | 'quality'>;

function scoreField(
  queryTokens: Set<string>,
  values: string[],
  kind: MatchKind,
  points: number,
  reasons: TemplateSuggestionReason[],
): number {
  const fieldTokens = new Set(values.flatMap((value) => [...tokens(value)]));
  let score = 0;
  for (const token of queryTokens) {
    if (!fieldTokens.has(token)) continue;
    score += points;
    addReason(reasons, { kind, term: token, points });
  }
  return score;
}

function rankTemplate(
  template: Template,
  normalizedQuery: string,
  queryTokens: Set<string>,
): TemplateSuggestion | undefined {
  const normalizedId = normalize(template.id);
  const normalizedName = normalize(template.name);
  const selectionGuide = resolveTemplateSelectionGuide(template);
  const reasons: TemplateSuggestionReason[] = [];
  let score = 0;
  const boundedQuery = ` ${normalizedQuery} `;

  // Naming a template is an explicit instruction and always outranks retrieval.
  if (
    normalizedQuery.length > 1 &&
    (boundedQuery.includes(` ${normalizedId} `) || boundedQuery.includes(` ${normalizedName} `))
  ) {
    score += 1000;
    addReason(reasons, { kind: 'explicit', term: template.id, points: 1000 });
  }

  score += scoreField(queryTokens, [template.id, template.name], 'name', 18, reasons);
  score += scoreField(queryTokens, template.tags, 'tag', 14, reasons);
  score += scoreField(queryTokens, [template.category ?? ''], 'category', 12, reasons);
  score += scoreField(queryTokens, selectionGuide.tone, 'tone', 12, reasons);
  score += scoreField(queryTokens, selectionGuide.bestFor, 'best-for', 10, reasons);
  score += scoreField(queryTokens, [selectionGuide.description], 'description', 6, reasons);
  score += scoreField(
    queryTokens,
    [selectionGuide.mechanics.visual, selectionGuide.mechanics.text],
    'mechanics',
    5,
    reasons,
  );
  score += scoreField(
    queryTokens,
    template.slots.flatMap((slot) => [slot.name, slot.hint ?? '']),
    'slot',
    5,
    reasons,
  );

  const qualityReady =
    template.slots.length > 0 &&
    template.slots.every(
      (slot) =>
        slot.safeRect !== undefined &&
        slot.constraints !== undefined &&
        Object.keys(slot.constraints).length > 0,
    );
  if (score > 0 && qualityReady) {
    score += 2;
    addReason(reasons, { kind: 'quality', term: 'safe-text-regions', points: 2 });
  }

  if (score === 0) return undefined;

  return {
    id: template.id,
    name: template.name,
    type: template.type,
    width: template.width,
    height: template.height,
    category: template.category,
    tags: template.tags,
    slots: template.slots.map((slot) => ({ name: slot.name, hint: slot.hint })),
    selectionGuide,
    score,
    reasons,
    qualityReady,
  };
}

/**
 * Retrieve candidate templates from semantic catalog cards. This deliberately
 * does not infer intent from hard-coded user phrases: the host LLM prepares the
 * brief and makes the final choice after reading each candidate's guide.
 */
export function suggestTemplates(options: SuggestTemplatesOptions): TemplateSuggestion[] {
  const normalizedQuery = normalize(options.query);
  if (normalizedQuery.length === 0) {
    throw new MemeError('INVALID_SPEC', 'template selection brief must not be empty');
  }

  const queryTokens = tokens(normalizedQuery);
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
  const minSlots = options.minSlots ?? 0;
  const maxSlots = options.maxSlots ?? 20;
  if (!Number.isInteger(minSlots) || minSlots < 0 || minSlots > 20) {
    throw new MemeError('INVALID_SPEC', 'minSlots must be an integer from 0 to 20');
  }
  if (!Number.isInteger(maxSlots) || maxSlots < 0 || maxSlots > 20) {
    throw new MemeError('INVALID_SPEC', 'maxSlots must be an integer from 0 to 20');
  }
  if (maxSlots < minSlots) {
    throw new MemeError('INVALID_SPEC', 'maxSlots must be greater than or equal to minSlots');
  }

  const suggestions = listTemplates({ type: options.type }, options.templatesDir)
    .filter((template) => template.slots.length >= minSlots && template.slots.length <= maxSlots)
    .map((template) => rankTemplate(template, normalizedQuery, queryTokens))
    .filter((result): result is TemplateSuggestion => result !== undefined)
    .sort((a, b) => b.score - a.score || (a.id === b.id ? 0 : a.id < b.id ? -1 : 1))
    .slice(0, limit);

  // Fallback to substring search if semantic scoring yields no results
  if (suggestions.length === 0) {
    const fallbackTemplates = listTemplates(
      { type: options.type, search: options.query },
      options.templatesDir,
    ).filter((template) => template.slots.length >= minSlots && template.slots.length <= maxSlots);

    return fallbackTemplates
      .map((template) => {
        const selectionGuide = resolveTemplateSelectionGuide(template);
        const qualityReady =
          template.slots.length > 0 &&
          template.slots.every(
            (slot) =>
              slot.safeRect !== undefined &&
              slot.constraints !== undefined &&
              Object.keys(slot.constraints).length > 0,
          );
        return {
          id: template.id,
          name: template.name,
          type: template.type,
          width: template.width,
          height: template.height,
          category: template.category,
          tags: template.tags,
          slots: template.slots.map((slot) => ({ name: slot.name, hint: slot.hint })),
          selectionGuide,
          score: 1,
          reasons: [{ kind: 'explicit' as const, term: 'fallback-search', points: 1 }],
          qualityReady,
        };
      })
      .slice(0, limit);
  }

  return suggestions;
}

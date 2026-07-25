import { load, type Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { OFFICIAL_SITE_SELECTORS, SCRAPER_CONFIG } from '../config/scraper-config';
import type { CardSetReference, OfficialSet, ParsedCard } from '../domain/catalog';
import { fingerprint } from '../utils/hashing';
import {
  normalizeText,
  nullableText,
  numberOrNull,
  slug,
  stableStrings,
} from '../utils/text-normalization';

function setId(set: OfficialSet): string {
  const productCode = set.name.match(/\[([A-Z0-9-]+)\]\s*$/i)?.[1];
  return (productCode ?? slug(set.name) ?? set.sourceSeriesId).toUpperCase();
}

function setReference(set: OfficialSet): CardSetReference {
  return { id: setId(set), sourceSeriesId: set.sourceSeriesId, name: set.name };
}

function fieldText(card: Cheerio<AnyNode>, selector: string): string {
  const field = card.find(selector).first().clone();
  field.find('h3').remove();
  field.find('br').replaceWith('\n');
  return normalizeText(field.text());
}

function classifyVariant(sourceId: string): ParsedCard['variant'] {
  const suffix = sourceId.match(/_([a-z])(\d+)$/i);
  if (!suffix) return { type: 'base', number: null };
  const number = Number(suffix[2]);
  if (suffix[1]?.toLowerCase() === 'p') return { type: 'parallel', number };
  if (suffix[1]?.toLowerCase() === 'r') return { type: 'reprint', number };
  return { type: 'unknown', number };
}

function splitValues(value: string): string[] {
  return stableStrings(value.split(/\s*(?:\/|,)\s*/));
}

export function parseSeries(html: string): OfficialSet[] {
  const $ = load(html);
  for (const selector of OFFICIAL_SITE_SELECTORS.seriesOptions) {
    const discovered = new Map<string, OfficialSet>();
    $(selector).each((_, option) => {
      const sourceSeriesId = normalizeText($(option).attr('value') ?? '');
      if (!/^\d+$/.test(sourceSeriesId)) return;
      const name = normalizeText($(option).text());
      if (!name || /^(all|recording|select)$/i.test(name)) return;
      if (!discovered.has(sourceSeriesId)) discovered.set(sourceSeriesId, { sourceSeriesId, name });
    });
    if (discovered.size) {
      return [...discovered.values()].sort(
        (left, right) =>
          left.sourceSeriesId.localeCompare(right.sourceSeriesId) ||
          left.name.localeCompare(right.name, 'en'),
      );
    }
  }
  throw new Error('No se encontró ninguna serie válida en el catálogo oficial.');
}

export function parseCards(html: string, set: OfficialSet): ParsedCard[] {
  const $ = load(html);
  const cards: ParsedCard[] = [];
  $(OFFICIAL_SITE_SELECTORS.cards).each((_, element) => {
    const card = $(element);
    const info = card
      .find(OFFICIAL_SITE_SELECTORS.cardInfo)
      .map((__, span) => normalizeText($(span).text()))
      .get();
    const sourceId = normalizeText(card.attr('id') ?? '').toUpperCase();
    const cardNumber = normalizeText(info[0] ?? '').toUpperCase();
    const name = normalizeText(card.find(OFFICIAL_SITE_SELECTORS.cardName).first().text());
    if (!sourceId || !cardNumber || !name) return;
    const imagePath =
      card.find(OFFICIAL_SITE_SELECTORS.image).first().attr('data-src') ??
      card.find(OFFICIAL_SITE_SELECTORS.image).first().attr('src');
    const imageUrl = imagePath ? new URL(imagePath, SCRAPER_CONFIG.sourceUrl).href : null;
    const costLabel = normalizeText(
      card.find(`${OFFICIAL_SITE_SELECTORS.costOrLife} h3`).first().text(),
    ).toLowerCase();
    const costOrLife = numberOrNull(fieldText(card, OFFICIAL_SITE_SELECTORS.costOrLife));
    const attributes = stableStrings(
      card
        .find(`${OFFICIAL_SITE_SELECTORS.attribute} img[alt], ${OFFICIAL_SITE_SELECTORS.attribute} i`)
        .map((__, node) => normalizeText($(node).attr('alt') ?? $(node).text()))
        .get(),
    );
    const parsed: ParsedCard = {
      id: sourceId,
      sourceId,
      baseCardId: cardNumber,
      cardNumber,
      name,
      rarity: normalizeText(info[1] ?? ''),
      category: normalizeText(info[2] ?? '').toUpperCase(),
      colors: splitValues(fieldText(card, OFFICIAL_SITE_SELECTORS.color)),
      cost: costLabel === 'cost' ? costOrLife : null,
      life: costLabel === 'life' ? costOrLife : null,
      power: numberOrNull(fieldText(card, OFFICIAL_SITE_SELECTORS.power)),
      counter: numberOrNull(fieldText(card, OFFICIAL_SITE_SELECTORS.counter)),
      attributes,
      traits: splitValues(fieldText(card, OFFICIAL_SITE_SELECTORS.traits)),
      effect: nullableText(fieldText(card, OFFICIAL_SITE_SELECTORS.effect)),
      trigger: nullableText(fieldText(card, OFFICIAL_SITE_SELECTORS.trigger)),
      imageUrl,
      imageFingerprint: imageUrl ? fingerprint(imageUrl.replace(/\?.*$/, '')) : undefined,
      variant: classifyVariant(sourceId),
      set: setReference(set),
    };
    cards.push(parsed);
  });
  if (!cards.length) throw new Error(`La serie ${set.sourceSeriesId} no contiene cartas parseables.`);
  return cards;
}

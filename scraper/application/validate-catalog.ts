import { SCRAPER_CONFIG } from '../config/scraper-config';
import type { CatalogData } from '../domain/catalog';

export interface ValidationOptions {
  previousTotalCards?: number;
  allowSmallCatalog?: boolean;
}

export function validateCatalog(data: CatalogData, options: ValidationOptions = {}): void {
  const errors: string[] = [];
  const minimum = options.allowSmallCatalog ? 1 : SCRAPER_CONFIG.minimumCards;
  if (data.cards.length < minimum) errors.push(`El catálogo contiene solo ${data.cards.length} cartas.`);
  if (!data.sets.length) errors.push('El catálogo no contiene expansiones.');
  const ids = new Set<string>();
  for (const card of data.cards) {
    if (ids.has(card.id)) errors.push(`ID duplicado: ${card.id}.`);
    ids.add(card.id);
    if (!card.name) errors.push(`Carta sin nombre: ${card.id}.`);
    if (!card.cardNumber) errors.push(`Carta sin número: ${card.id}.`);
    if (card.variant.type !== 'base' && !data.cards.some((candidate) => candidate.id === card.baseCardId)) {
      errors.push(`La variante ${card.id} no tiene carta base ${card.baseCardId}.`);
    }
    if (!card.sets.length) errors.push(`Carta sin expansión: ${card.id}.`);
  }
  for (const set of data.sets) {
    if (set.cardCount === 0) errors.push(`Expansión vacía: ${set.id}.`);
  }
  if (
    options.previousTotalCards &&
    data.cards.length < options.previousTotalCards * SCRAPER_CONFIG.minimumRetainedRatio
  ) {
    errors.push(
      `Caída anormal: ${data.cards.length} cartas frente a ${options.previousTotalCards} anteriores.`,
    );
  }
  if (errors.length) throw new Error(`Validación del catálogo fallida:\n- ${errors.join('\n- ')}`);
}

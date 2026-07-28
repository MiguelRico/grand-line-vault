type StaticSetReference = {
  id: string;
  sourceSeriesId: string;
  name: string;
};

export type StaticCatalogCard = {
  id: string;
  sourceId: string;
  baseCardId: string;
  cardNumber: string;
  name: string;
  rarity: string;
  category: string;
  colors: string[];
  cost: number | null;
  life: number | null;
  power: number | null;
  counter: number | null;
  attributes: string[];
  imageUrl: string;
  variant: { type: string; number: number | null };
  sets: StaticSetReference[];
};

export type StaticCatalogSet = {
  id: string;
  sourceSeriesId: string;
  name: string;
  normalizedName?: string;
  type?: string | null;
  cardCount?: number;
};

export type StaticCatalogManifest = {
  catalogVersion: string;
  generatedAt: string;
  cardsUrl: string;
  setsUrl: string;
};

export function normalizeIndexText(value: unknown): string {
  const text =
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : '';
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function normalizeCardNumber(value: string): string {
  return normalizeIndexText(value).replace(/\s/g, '');
}

function normalizeRarity(value: string): string {
  const rarity: Record<string, string> = {
    C: 'COMMON',
    COMMON: 'COMMON',
    UC: 'UNCOMMON',
    UNCOMMON: 'UNCOMMON',
    R: 'RARE',
    RARE: 'RARE',
    SR: 'SUPER_RARE',
    'SUPER RARE': 'SUPER_RARE',
    SEC: 'SECRET_RARE',
    'SECRET RARE': 'SECRET_RARE',
    L: 'LEADER',
    LEADER: 'LEADER',
    P: 'PROMO',
    PR: 'PROMO',
    PROMO: 'PROMO',
    TR: 'TREASURE_RARE',
    'TREASURE RARE': 'TREASURE_RARE',
    SPECIAL: 'SPECIAL',
    'SP CARD': 'SPECIAL',
  };
  return rarity[normalizeIndexText(value)] ?? 'UNKNOWN';
}

function normalizeVariant(value: string): string {
  if (value === 'base') return 'BASE';
  if (value === 'parallel') return 'PARALLEL';
  if (value === 'reprint') return 'REPRINT';
  return 'UNKNOWN';
}

function searchPrefixes(name: string, cardNumber: string): string[] {
  const value = normalizeIndexText(`${name} ${cardNumber}`);
  const prefixes = new Set<string>();
  for (const token of value.split(/\s+/).filter(Boolean)) {
    for (let size = 1; size <= Math.min(token.length, 24); size += 1)
      prefixes.add(token.slice(0, size));
  }
  for (let size = 1; size <= Math.min(value.length, 40); size += 1)
    prefixes.add(value.slice(0, size));
  return [...prefixes].slice(0, 200);
}

export function catalogDocumentId(baseCardId: string): string {
  return `CARD::${normalizeCardNumber(baseCardId)}`;
}

export function buildCatalogDocuments(cards: StaticCatalogCard[], generatedAt: string) {
  const groups = new Map<string, StaticCatalogCard[]>();
  for (const card of cards) {
    const group = groups.get(card.baseCardId) ?? [];
    group.push(card);
    groups.set(card.baseCardId, group);
  }

  return [...groups.values()].map((prints) => {
    const base = prints.find((card) => card.variant.type === 'base') ?? prints[0];
    if (!base) throw new Error('EMPTY_STATIC_CARD_GROUP');
    const episode = base.sets[0] ?? {
      id: 'UNKNOWN',
      sourceSeriesId: 'UNKNOWN',
      name: 'Sin expansión',
    };
    const setCodes = [
      ...new Set(prints.flatMap((card) => card.sets.map((set) => normalizeIndexText(set.id)))),
    ];
    const colors = [...new Set(prints.flatMap((card) => card.colors.map(normalizeIndexText)))];
    const variantTypes = [...new Set(prints.map((card) => normalizeVariant(card.variant.type)))];
    const id = catalogDocumentId(base.baseCardId);
    return {
      id,
      tcggoId: null,
      name: base.name,
      normalizedName: normalizeIndexText(base.name),
      card_number: base.cardNumber,
      normalized_card_number: normalizeCardNumber(base.cardNumber),
      image: base.imageUrl,
      episode: {
        id: episode.sourceSeriesId || episode.id,
        name: episode.name,
        code: episode.id,
        normalized_code: normalizeIndexText(episode.id),
      },
      setCodes,
      rarity: base.rarity,
      rarity_normalized: normalizeRarity(base.rarity),
      color: base.colors.join('/ ') || null,
      artist: null,
      game: {
        card_type: normalizeIndexText(base.category) || 'UNKNOWN',
        colors,
        cost: base.cost,
        life: base.life,
        power: base.power,
        counter: base.counter,
        attributes: base.attributes,
      },
      variantTypes,
      variantCount: Math.max(0, prints.length - 1),
      totalVariants: prints.length,
      searchPrefixes: searchPrefixes(base.name, base.cardNumber),
      sort: {
        cardNumber: normalizeCardNumber(base.cardNumber),
        name: normalizeIndexText(base.name),
        cost: base.cost ?? -1,
        power: base.power ?? -1,
      },
      source: {
        providerId: 'OFFICIAL_STATIC',
        providerCardId: base.sourceId,
        fetchedAt: generatedAt,
      },
      bootstrappedAt: new Date().toISOString(),
    };
  });
}

export function buildSetDocuments(sets: StaticCatalogSet[], generatedAt: string) {
  return sets.map((set) => ({
    id: set.sourceSeriesId || set.id,
    name: set.name,
    slug: '',
    code: set.id,
    normalized_code: normalizeIndexText(set.id),
    released_at: '',
    source: {
      providerId: 'OFFICIAL_STATIC',
      providerCardId: set.sourceSeriesId,
      fetchedAt: generatedAt,
    },
  }));
}

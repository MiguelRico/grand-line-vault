function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function numericId(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function tcgId(value: unknown): number | string | null {
  return typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))
    ? value
    : null;
}

export function buildCatalogIndexEnrichment(rawCard: Record<string, unknown>, fetchedAt: string) {
  const rawLinks =
    rawCard.links && typeof rawCard.links === 'object'
      ? (rawCard.links as Record<string, unknown>)
      : {};
  return {
    tcggoId: String(rawCard.id),
    image: String(rawCard.image),
    artist: rawCard.artist && typeof rawCard.artist === 'object' ? rawCard.artist : null,
    cardmarket_id: numericId(rawCard.cardmarket_id),
    tcgplayer_id: numericId(rawCard.tcgplayer_id),
    tcgid: tcgId(rawCard.tcgid),
    links: {
      cardmarket: httpUrl(rawLinks.cardmarket),
      tcgplayer: httpUrl(rawLinks.tcgplayer),
    },
    tcggo_url: httpUrl(rawCard.tcggo_url),
    source: {
      providerId: 'TCGGO' as const,
      providerCardId: String(rawCard.id),
      fetchedAt,
    },
    enrichedAt: fetchedAt,
  };
}

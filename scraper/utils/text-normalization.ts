export function normalizeText(value: string): string {
  return value
    .replace(/<br\b[^>]*>/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function nullableText(value: string): string | null {
  const normalized = normalizeText(value);
  return !normalized || /^[-–—]$/.test(normalized) ? null : normalized;
}

export function numberOrNull(value: string): number | null {
  const normalized = nullableText(value);
  if (!normalized) return null;
  const match = normalized.replaceAll(',', '').match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

export function stableStrings(values: string[]): string[] {
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'en'),
  );
}

export function slug(value: string): string {
  return normalizeText(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

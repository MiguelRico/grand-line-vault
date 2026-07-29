const OFFICIAL_IMAGE_ORIGIN = 'https://en.onepiece-cardgame.com';
const OFFICIAL_IMAGE_PATH = '/images/cardlist/card/';
const SAFE_IMAGE_FILE = /^[A-Za-z0-9_-]+\.png$/;
const SAFE_IMAGE_VERSION = /^\d{1,16}$/;

export function catalogImageProxyUrl(imageUrl: unknown): string {
  if (typeof imageUrl !== 'string' || !imageUrl) return '';
  try {
    const parsed = new URL(imageUrl);
    if (parsed.origin !== OFFICIAL_IMAGE_ORIGIN) return imageUrl;
    if (!parsed.pathname.startsWith(OFFICIAL_IMAGE_PATH)) return '';
    const file = parsed.pathname.slice(OFFICIAL_IMAGE_PATH.length);
    const version = parsed.search.slice(1);
    if (!SAFE_IMAGE_FILE.test(file) || (version && !SAFE_IMAGE_VERSION.test(version))) return '';
    const query = new URLSearchParams({ action: 'image', file });
    if (version) query.set('v', version);
    return `/api/catalog?${query.toString()}`;
  } catch {
    return '';
  }
}

export function withProxiedCatalogImage(document: Record<string, unknown>) {
  const variants = Array.isArray(document.variants)
    ? document.variants.map((variant) => {
        if (!variant || typeof variant !== 'object' || Array.isArray(variant)) return variant;
        const value = variant as Record<string, unknown>;
        return { ...value, image: catalogImageProxyUrl(value.image) };
      })
    : document.variants;
  return {
    ...document,
    image: catalogImageProxyUrl(document.image),
    ...(variants === undefined ? {} : { variants }),
  };
}

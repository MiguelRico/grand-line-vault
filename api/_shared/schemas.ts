import { z } from 'zod';

export const appSettingsSchema = z.object({
  theme: z.enum(['LIGHT', 'DARK']),
  catalogDataSource: z.enum(['OFFICIAL_STATIC', 'ONE_PIECE_API']).default('OFFICIAL_STATIC'),
});

const priceSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  source: z.string().min(1).max(100),
  sourceProductId: z.string().max(200).optional(),
  updatedAt: z.string().datetime().optional(),
  marketType: z.enum(['MARKET', 'LOW', 'MID', 'LISTED', 'UNKNOWN']),
});

const normalizeCardNumber = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/^([A-Z]+)-(\d)/, '$1$2');

const snapshotSchema = z
  .object({
    schemaVersion: z.literal(2).optional(),
    normalizedCardNumber: z.string().min(1).max(40).optional(),
    printKey: z.string().min(1).max(240).optional(),
    code: z.string().min(1).max(40),
    name: z.string().min(1).max(200),
    setCode: z.string().min(1).max(40),
    rarity: z.string().max(40).optional(),
    variantLabel: z.string().max(100).optional(),
    imageUrl: z.string().url(),
    catalogPrice: priceSchema.optional(),
    catalogProvider: z
      .enum(['OFFICIAL_STATIC', 'ONE_PIECE_API', 'MOCK', 'LEGACY_EXTERNAL'])
      .optional(),
    sourceCardId: z.string().min(1).max(200).optional(),
    sourceVariantId: z.string().min(1).max(200).optional(),
    catalogFetchedAt: z.string().datetime().optional(),
  })
  .transform((snapshot) => {
    const provider = snapshot.catalogProvider ?? 'LEGACY_EXTERNAL';
    const sourcePrint =
      snapshot.sourceVariantId ??
      snapshot.sourceCardId ??
      `${normalizeCardNumber(snapshot.code)}::${snapshot.variantLabel ?? 'BASE'}`;
    return {
      ...snapshot,
      schemaVersion: 2 as const,
      normalizedCardNumber: snapshot.normalizedCardNumber ?? normalizeCardNumber(snapshot.code),
      printKey: snapshot.printKey ?? `${provider}::${sourcePrint}`,
    };
  });

export const collectionItemSchema = z
  .object({
    id: z.string().min(1).max(160),
    cardId: z.string().min(1).max(160),
    cardVariantId: z.string().min(1).max(160),
    cardSnapshot: snapshotSchema,
    quantity: z.number().int().min(1).max(999),
    language: z.enum(['EN', 'JP', 'FR', 'ES', 'IT', 'DE', 'UNKNOWN']),
    condition: z.enum(['MINT', 'NEAR_MINT', 'EXCELLENT', 'GOOD', 'PLAYED', 'POOR', 'UNKNOWN']),
    favorite: z.boolean(),
    boxId: z.string().min(1).max(160).optional(),
    sectionId: z.string().min(1).max(160).optional(),
    acquisitionPrice: z
      .object({ amount: z.number().nonnegative(), currency: z.string().length(3) })
      .optional(),
    notes: z.string().max(1000).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine((item) => !item.sectionId || Boolean(item.boxId), {
    message: 'Una sección debe pertenecer a una caja.',
    path: ['sectionId'],
  });

const sectionSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  capacity: z.number().int().positive().max(10000).optional(),
  notes: z.string().max(500).optional(),
});

export const storageBoxSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  sections: z.array(sectionSchema).min(1).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const salesPackSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  status: z.enum(['DRAFT', 'READY', 'SOLD', 'ARCHIVED']),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(160),
        collectionItemId: z.string().min(1).max(160),
        quantity: z.number().int().min(1).max(99),
        snapshot: snapshotSchema,
      }),
    )
    .min(1)
    .max(500),
  salePrice: z
    .object({ amount: z.number().nonnegative(), currency: z.string().length(3) })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

import { z } from 'zod';

const priceSchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  source: z.string().min(1).max(100),
  sourceProductId: z.string().max(200).optional(),
  updatedAt: z.string().datetime().optional(),
  marketType: z.enum(['MARKET', 'LOW', 'MID', 'LISTED', 'UNKNOWN']),
});

const snapshotSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  setCode: z.string().min(1).max(40),
  rarity: z.string().max(40).optional(),
  variantLabel: z.string().max(100).optional(),
  imageUrl: z.string().url(),
  catalogPrice: priceSchema.optional(),
  catalogProvider: z.enum(['ARJUNKAI_OPTCG', 'OPTCG_API', 'MOCK']).optional(),
  catalogFetchedAt: z.string().datetime().optional(),
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
    tradeableQuantity: z.number().int().min(0).max(999),
    acquisitionPrice: z
      .object({ amount: z.number().nonnegative(), currency: z.string().length(3) })
      .optional(),
    notes: z.string().max(1000).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .refine((item) => item.tradeableQuantity <= item.quantity, {
    message: 'La cantidad intercambiable no puede superar la cantidad total.',
    path: ['tradeableQuantity'],
  });

export const deckSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  leaderCardId: z.string().max(160).optional(),
  cards: z
    .array(
      z.object({
        id: z.string().min(1).max(160),
        collectionItemId: z.string().min(1).max(160),
        cardId: z.string().min(1).max(160),
        quantity: z.number().int().min(1).max(99),
        snapshot: snapshotSchema,
      }),
    )
    .max(200),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

import { z } from 'zod';

export const collectionEntrySchema = z
  .object({
    id: z.string().min(1).max(160),
    ownerId: z.string().min(1).max(160),
    catalogCardId: z.string().min(1).max(160),
    catalogVariantId: z.string().min(1).max(200).nullable(),
    quantity: z.number().int().min(1).max(999),
    language: z.enum(['EN', 'JP', 'FR', 'ES', 'IT', 'DE', 'UNKNOWN']),
    condition: z.enum([
      'MINT',
      'NEAR_MINT',
      'EXCELLENT',
      'GOOD',
      'PLAYED',
      'POOR',
      'UNKNOWN',
    ]),
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
  .refine((entry) => !entry.sectionId || Boolean(entry.boxId), {
    message: 'Una sección debe pertenecer a un contenedor.',
    path: ['sectionId'],
  });

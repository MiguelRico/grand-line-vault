import { z } from 'zod';

export const wishlistEntrySchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  catalogCardId: z.string().min(1),
  catalogVariantId: z.string().min(1).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

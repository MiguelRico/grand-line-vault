import { z } from 'zod';

const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});

export const storageSectionSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(160),
  code: z.string().min(1).max(80),
  capacity: z.number().int().positive().max(100_000).optional(),
  notes: z.string().max(1000).optional(),
});

export const storageBoxSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  location: z.string().max(300).optional(),
  sections: z.array(storageSectionSchema).max(200),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const salesPackItemSchema = z.object({
  id: z.string().min(1).max(160),
  collectionItemId: z.string().min(1).max(160),
  quantity: z.number().int().positive().max(999),
});

export const salesPackSchema = z.object({
  id: z.string().min(1).max(160),
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  status: z.enum(['DRAFT', 'READY', 'SOLD', 'ARCHIVED']),
  items: z.array(salesPackItemSchema).max(500),
  salePrice: moneySchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

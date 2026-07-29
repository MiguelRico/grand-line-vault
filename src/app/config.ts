import { z } from 'zod';

const schema = z.object({
  VITE_APP_NAME: z.string().default('Grand Line Vault'),
  VITE_USE_MOCK_CARD_DETAIL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  VITE_SHOW_CATALOG_NORMALIZATION: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  VITE_CARD_DETAIL_CACHE_TTL_MS: z.coerce
    .number()
    .int()
    .min(10_000)
    .max(86_400_000)
    .default(300_000),
  VITE_FIREBASE_API_KEY: z.string().default(''),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().default(''),
  VITE_FIREBASE_PROJECT_ID: z.string().default(''),
  VITE_FIREBASE_APP_ID: z.string().default(''),
});

export const config = schema.parse(import.meta.env);

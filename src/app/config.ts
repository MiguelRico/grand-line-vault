import { z } from 'zod';

const schema = z.object({
  VITE_APP_NAME: z.string().default('Grand Line Vault'),
  VITE_USE_MOCK_DATA: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  VITE_DEFAULT_CURRENCY: z.string().length(3).default('EUR'),
  VITE_DEFAULT_PAGE_SIZE: z.coerce.number().int().min(8).max(100).default(24),
});

export const config = schema.parse(import.meta.env);

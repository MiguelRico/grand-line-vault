const DEFAULT_BASE_URL = 'https://one-piece-tcg-prices.p.rapidapi.com';
const MAX_ATTEMPTS = 3;
const MIN_INTERVAL_MS = 120;

let nextRequestAt = 0;

export class TcggoError extends Error {
  constructor(
    readonly code: 'NOT_CONFIGURED' | 'RATE_LIMITED' | 'UPSTREAM' | 'INVALID_RESPONSE',
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

async function throttle(): Promise<void> {
  const waitMs = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Math.max(Date.now(), nextRequestAt) + MIN_INTERVAL_MS;
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
}

function configuration(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.TCGGO_API_KEY?.trim();
  if (!apiKey) {
    throw new TcggoError(
      'NOT_CONFIGURED',
      'TCGGO todavía no está configurado en el servidor.',
      503,
    );
  }
  return {
    apiKey,
    baseUrl: process.env.TCGGO_API_BASE_URL?.trim() || DEFAULT_BASE_URL,
  };
}

async function request(path: string, params?: URLSearchParams): Promise<unknown> {
  const { apiKey, baseUrl } = configuration();
  const url = new URL(path, baseUrl);
  params?.forEach((value, key) => url.searchParams.set(key, value));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await throttle();
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': url.host,
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (response.status === 429) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
          continue;
        }
        throw new TcggoError(
          'RATE_LIMITED',
          'TCGGO ha alcanzado temporalmente su límite de consultas.',
          429,
        );
      }
      if (!response.ok) {
        if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
          continue;
        }
        throw new TcggoError('UPSTREAM', 'TCGGO no ha podido completar la consulta.');
      }
      return await response.json();
    } catch (error) {
      if (error instanceof TcggoError) throw error;
      if (attempt === MAX_ATTEMPTS) {
        throw new TcggoError('UPSTREAM', 'No se pudo conectar con TCGGO.');
      }
    }
  }
  throw new TcggoError('UPSTREAM', 'No se pudo conectar con TCGGO.');
}

export const tcggoClient = {
  card(id: string): Promise<unknown> {
    if (!/^\d+$/.test(id)) {
      throw new TcggoError('INVALID_RESPONSE', 'El identificador TCGGO no es válido.', 400);
    }
    return request(`/cards/${id}`);
  },
  cardsByNumber(cardNumber: string): Promise<unknown> {
    return request(
      '/cards',
      new URLSearchParams({ card_number: cardNumber.slice(0, 40), per_page: '100' }),
    );
  },
};

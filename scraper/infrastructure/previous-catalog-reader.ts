import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CatalogManifest } from '../domain/catalog';

export async function readPreviousManifest(outputDirectory: string): Promise<CatalogManifest | null> {
  try {
    return JSON.parse(
      await readFile(path.join(outputDirectory, 'manifest.json'), 'utf8'),
    ) as CatalogManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error('El manifest existente no es JSON válido.', { cause: error });
  }
}

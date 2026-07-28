# Grand Line Vault

Aplicación React/TypeScript para gestionar una colección personal de ONE PIECE CARD GAME.

## Desarrollo

```bash
npm ci
npm run dev
```

Variables principales:

- `VITE_USE_MOCK_DATA=true|false`
- `VITE_USE_MOCK_CARD_DETAIL=true|false`
- `VITE_DEFAULT_CURRENCY=EUR`
- `VITE_DEFAULT_PAGE_SIZE=24`
- `VITE_CARD_DETAIL_CACHE_TTL_MS=300000`
- `TCGGO_API_KEY` y `TCGGO_API_BASE_URL`, solo en el servidor
- variables de Firebase Admin y autenticación documentadas en `.env.example`

Las credenciales TCGGO nunca se exponen mediante variables `VITE_`.

`VITE_USE_MOCK_CARD_DETAIL=true` sustituye únicamente el proveedor de detalle por uno
completamente local. El listado continúa usando el índice, no se realizan peticiones de detalle a
TCGGO y la pantalla conserva la imagen y las estadísticas de juego del índice. Su valor
predeterminado es `false`.

## Catálogo

El catálogo activo usa una arquitectura híbrida:

```text
Catálogo/listado → API propia → índice mínimo de Firestore
Detalle          → caso de uso → repositorio → API propia → TCGGO
```

El listado, la búsqueda, los filtros, la ordenación y el scroll infinito no consultan TCGGO. El
detalle se solicita bajo demanda y se conserva en una caché local con TTL. Si TCGGO no responde,
la interfaz mantiene visible la ficha mínima procedente de Firestore.

Los JSON generados desde la web oficial son la fuente canónica para construir `catalogIndex` y
`catalogSets`. El bootstrap protegido valida esos ficheros y reconstruye la proyección de
Firestore. Las imágenes oficiales permanecen referenciadas en el índice y se entregan al navegador
mediante el proxy del mismo origen.

La guía de arquitectura y operación está en
[docs/card-catalog.md](docs/card-catalog.md).

## Calidad y build

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

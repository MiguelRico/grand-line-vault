# Grand Line Vault

Aplicación React/TypeScript para gestionar una colección personal de ONE PIECE CARD GAME.

## Desarrollo

```bash
npm ci
npm run dev
```

Variables principales:

- `VITE_USE_MOCK_DATA=true|false`
- `VITE_DEFAULT_CURRENCY=EUR`
- `VITE_DEFAULT_PAGE_SIZE=24`
- `ONE_PIECE_API_KEY` (solo servidor; necesaria para la fuente remota opcional)
- `ONE_PIECE_API_BASE_URL` (opcional; usa el host oficial de RapidAPI por defecto)
- Variables de Firebase Admin y autenticación documentadas por el entorno de despliegue.

Los datos privados se sirven desde las funciones `/api` y Firestore. La clave de One Piece API
nunca se entrega al navegador.

## Catálogo global

El catálogo estático continúa siendo la fuente principal y predeterminada:

```text
Bandai → scraper Node/TypeScript → public/catalog → CDN
       → StaticCatalogRepository → React
```

```bash
npm run catalog:scrape
npm run catalog:validate
```

Desde Ajustes también se puede seleccionar One Piece API. Sus consultas pasan por
`/api/one-piece-catalog`, que añade `x-rapidapi-key` en el servidor.

La guía completa de arquitectura, IDs, caché, actualización, workflow, reversión y limitaciones
está en [docs/card-catalog.md](docs/card-catalog.md).

## Calidad y build

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`prebuild` valida el catálogo existente sin conectarse a la web oficial.

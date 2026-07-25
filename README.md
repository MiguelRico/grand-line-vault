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
- Variables de Firebase Admin y autenticación documentadas por el entorno de despliegue.

Los datos privados se sirven desde las funciones `/api` y Firestore. El catálogo global no se
guarda en Firestore ni se consulta a través de esas funciones.

## Catálogo global

El catálogo se extrae de la web oficial y se publica como JSON estático versionado:

```text
Bandai → scraper Node/TypeScript → public/catalog → Vercel CDN
       → StaticCatalogRepository → React
```

```bash
npm run catalog:scrape
npm run catalog:validate
```

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

# Grand Line Vault

Aplicación React/TypeScript para gestionar una colección personal de ONE PIECE CARD GAME.

## Desarrollo

```bash
npm ci
npm run dev
```

Variables principales:

- `VITE_USE_MOCK_CARD_DETAIL=true|false`
- `VITE_CARD_DETAIL_CACHE_TTL_MS=300000`
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` y
  `VITE_FIREBASE_APP_ID`
- `TCGGO_API_KEY` y `TCGGO_API_BASE_URL`, solo en el servidor
- variables de Firebase Admin y autenticación documentadas en `.env.example`

Las credenciales TCGGO nunca se exponen mediante variables `VITE_`.

Firebase Authentication usa correo y contraseña y mantiene la sesión local hasta que el usuario
la cierre. Cada cuenta dispone de un perfil `users/{uid}` inicialmente gratuito:
`premium=false`, `cloudSync=false` y `adsEnabled=true`.

Las cuentas gratuitas guardan colección y lista de deseos en IndexedDB, y cajas y packs en
`localStorage`. Cuando el perfil tiene simultáneamente `premium=true` y `cloudSync=true`, estos
cuatro recursos se sincronizan en subcolecciones privadas de `users/{uid}` en Firestore. La
primera activación migra los datos locales y, a partir de entonces, la copia remota es la fuente
autoritativa. Solo se persisten referencias de catálogo y metadatos del usuario; los datos
enriquecidos de TCGGO siguen viviendo únicamente en memoria.

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

La separación entre autenticación, perfil y colección local está documentada en
[docs/local-collection-and-auth.md](docs/local-collection-and-auth.md).

## Calidad y build

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

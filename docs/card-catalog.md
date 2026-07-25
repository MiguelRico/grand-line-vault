# Catálogo oficial de cartas

## Arquitectura

El catálogo público y la colección privada son dominios independientes:

```text
Bandai → scraper Node/TypeScript → JSON versionado → public/catalog
       → CDN de Vercel → StaticCatalogRepository → React

Firestore/API de Vercel → cantidades, ubicación, notas y favoritos
```

El navegador nunca ejecuta scraping ni consulta Bandai al cambiar filtros. Descarga una sola vez
el catálogo referenciado por `manifest.json`, construye índices en memoria y filtra/pagina
localmente. Firestore y las funciones bajo `api/` siguen atendiendo únicamente datos privados.

## Actualización y validación

Requisitos: la versión de Node indicada por el workflow (Node 22 o posterior) y el lockfile npm.

```bash
npm ci
npm run catalog:scrape
npm run catalog:validate
npm test
npm run lint
npm run build
```

`catalog:scrape` descubre las opciones numéricas de `select[name="series"]`, limita la
concurrencia, aplica pausas, timeout y reintentos, normaliza las cartas y publica el manifest al
final. Si falla una petición o una validación, el manifest anterior no se sustituye.

`catalog:validate` es offline: comprueba esquemas, versiones, rutas, totales, IDs, relaciones,
expansiones vacías y el umbral mínimo. `prebuild` ejecuta solo esta validación; un build de Vercel
no depende de Bandai.

Los archivos generados son:

- `public/catalog/manifest.json`: punto de entrada revalidable.
- `public/catalog/cards.<hash>.json`: versiones concretas de cartas.
- `public/catalog/sets.<hash>.json`: expansiones descubiertas.
- `public/catalog/filters.<hash>.json`: valores derivados del contenido.
- `public/catalog/legacy-id-map.<hash>.json`: resolución de IDs anteriores.
- `public/catalog/metadata.json`: duración, versión del scraper, totales y warnings.

El hash SHA-256 truncado se calcula sobre cartas y expansiones normalizadas; las fechas y la
duración no cambian `catalogVersion`. Los archivos con hash usan caché inmutable y el manifest se
revalida.

## IDs y compatibilidad

`sourceId` e `id` conservan el ID exacto del nodo oficial (`OP01-001`, `OP01-001_p1`,
`OP01-001_r1`). `cardNumber` y `baseCardId` representan el número impreso. Los sufijos `_pN` y
`_rN` se clasifican como paralela y reimpresión; otros sufijos se preservan como `unknown`.

La UI continúa exponiendo `BASE::<cardNumber>` y
`VARIANT::<cardNumber>::<sourceId>`, que eran los formatos de la fachada anterior. El mapa legado
también acepta IDs oficiales y antiguos. La resolución ocurre en memoria; no existe una migración
automática ni destructiva de Firestore. Los snapshots ya guardados se conservan por
retrocompatibilidad, pero el catálogo global no se escribe en Firestore.

## Cambios futuros del HTML

Los selectores están centralizados en `scraper/config/scraper-config.ts`. Primero se actualizan
las fixtures mínimas de `scraper/test/fixtures/`, después el parser y sus pruebas. No deben
añadirse IDs de series a mano. Un warning de conflicto indica que dos series oficiales publicaron
valores incompatibles para una misma versión; se conserva el primer valor determinista y todas
las relaciones de expansión. Un fallo de validación requiere revisar el HTML o los datos antes de
publicar.

## GitHub Actions y reversión

`.github/workflows/update-card-catalog.yml` se ejecuta los lunes a las 04:00 UTC y mediante
**Actions → Update official card catalog → Run workflow**. Instala con `npm ci`, prueba, extrae,
valida y solo crea un commit si `public/catalog` cambia.

Para revertir una actualización, se revierte el commit `chore(catalog): update official card
data`. Al desplegar ese commit, el manifest vuelve a apuntar a la versión anterior. No se deben
editar JSON generados manualmente.

## Imágenes, límites y uso de los datos

Las imágenes permanecen en URLs oficiales, con el componente común de lazy loading y fallback;
no se copian miles de imágenes al repositorio. Una indisponibilidad temporal del servidor de
imágenes puede activar el placeholder aunque los datos del catálogo estén disponibles.

El parser tolera cambios menores, no un rediseño completo del sitio. Antes de distribuir
públicamente datos o imágenes debe revisarse la política de uso vigente del sitio oficial. Los
datos proceden de la web oficial de ONE PIECE CARD GAME. Este proyecto no está afiliado ni
respaldado por Bandai; las marcas e imágenes pertenecen a sus respectivos titulares. El scraper
limita concurrencia y frecuencia para reducir carga.

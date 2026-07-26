# Correspondencia de datos entre el catálogo JSON y One Piece API

Fecha de revisión: 26 de julio de 2026.

## 1. Objetivo y fuentes comparadas

Este documento compara los datos de una carta obtenidos desde:

1. El catálogo JSON estático generado por Grand Line Vault:
   - `public/catalog/manifest.json`
   - `public/catalog/cards.<version>.json`
   - `public/catalog/sets.<version>.json`
   - `public/catalog/filters.<version>.json`
2. One Piece API:
   - `GET /cards`
   - `GET /cards/{id}`
   - `GET /episodes`
3. El modelo canónico de la aplicación definido en `src/domain/models.ts`.

La comparación de la API se basa tanto en su
[documentación oficial](https://one-piece-api.com/docs/) como en respuestas reales observadas en
producción. Esto es importante porque la respuesta real contiene algunos campos y nombres que no
coinciden exactamente con el ejemplo público.

## 2. Resumen ejecutivo

Sí es posible normalizar ambas fuentes, pero el mapeo no es completo ni simétrico:

- La identidad básica, nombre, número de carta, color, rareza, expansión e imagen se pueden
  normalizar con una fiabilidad alta.
- Las variantes pueden agruparse por número de carta, pero `variant.type` y `version` no expresan
  exactamente el mismo concepto.
- El JSON estático contiene los datos de juego necesarios para filtrar por tipo, coste y poder.
- La respuesta real de One Piece API aporta precios, artista, enlaces de mercado y metadatos
  adicionales, pero no aporta de forma fiable tipo de carta, coste ni poder.
- La API devuelve color y rareza, pero no ofrece actualmente filtros server-side documentados para
  esos campos. Para filtrarlos correctamente sería necesario descargar e indexar todas las páginas
  relevantes.

La estrategia recomendada es usar un modelo canónico con campos opcionales, conservar la
procedencia de cada valor y enriquecer los registros de la API con los datos de juego del JSON
cuando exista una correspondencia inequívoca por `card_number`.

## 3. Correspondencia campo a campo

### 3.1 Identidad y presentación

| Concepto          | JSON estático                        | One Piece API                 | Modelo canónico                         | Correspondencia                                                             |
| ----------------- | ------------------------------------ | ----------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| ID del registro   | `id: string`                         | `id: number`                  | `id: string`                            | No deben compararse directamente. El ID canónico debe incluir el proveedor. |
| ID original       | `sourceId`                           | `id`                          | `external_id` y `source.providerCardId` | Exacta dentro de cada proveedor, no entre proveedores.                      |
| Carta base        | `baseCardId`                         | No existe como campo separado | `base_card_id` en cada arte             | Se obtiene agrupando la API por `card_number`.                              |
| Número de carta   | `cardNumber`                         | `card_number`                 | `card_number`                           | Alta fiabilidad después de normalizar mayúsculas, espacios y guiones.       |
| Código combinado  | No existe                            | `card_code_number`            | `card_code_number`                      | Campo exclusivo de la API; combina expansión y número.                      |
| Nombre            | `name`                               | `name`                        | `name`                                  | Alta fiabilidad, aunque puede variar la puntuación o el uso de espacios.    |
| Nombre con número | Se construye con `name + cardNumber` | `name_numbered`               | `name_numbered`                         | Exacta o derivable.                                                         |
| Slug              | No existe                            | `slug`                        | `slug`                                  | Se conserva desde la API o se genera desde `name` para el JSON.             |
| Tipo de producto  | Implícitamente carta individual      | `type`, normalmente `singles` | `type`                                  | No es el tipo de carta del juego.                                           |
| Imagen            | `imageUrl`                           | `image`                       | `image`                                 | Correspondencia directa, con orígenes y formatos distintos.                 |

Regla de identidad recomendada:

```text
base_key  = normalize(card_number)
print_key = provider + external_id
```

`card_number` identifica el diseño funcional de una carta, pero no una impresión o arte concreto.
Por tanto, no debe utilizarse como identificador único de una variante.

### 3.2 Expansión

| Concepto                | JSON estático                     | One Piece API                                  | Modelo canónico                | Correspondencia                                                                |
| ----------------------- | --------------------------------- | ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Expansiones de la carta | `sets[]`                          | `episode`                                      | `episode`                      | Parcial: JSON admite varias expansiones; API devuelve una expansión principal. |
| ID de expansión         | `sets[].id`                       | `episode.id: number`                           | `episode.id: string`           | Los IDs pertenecen a espacios distintos y no son intercambiables.              |
| Código                  | `sets[].id`                       | `episode.code`                                 | `episode.code`                 | Es la mejor clave para cruzar fuentes tras normalizar guiones.                 |
| ID del origen           | `sets[].sourceSeriesId`           | `episode.id`                                   | Metadato de procedencia        | No existe garantía de equivalencia.                                            |
| Nombre                  | `sets[].name`                     | `episode.name`                                 | `episode.name`                 | Alta fiabilidad como apoyo, no como clave única.                               |
| Fecha, logo y slug      | No disponibles                    | `released_at`, `logo`, `slug`                  | Campos opcionales de `episode` | Enriquecimiento exclusivo de la API.                                           |
| Totales y precios       | `cardCount` en el fichero de sets | `cards_total`, `cards_printed_total`, `prices` | Campos opcionales de `episode` | Semántica y actualización distintas.                                           |

Normalización recomendada del código:

```text
OP-16 → OP16
OP16  → OP16
ST-01 → ST01
```

El cruce debe realizarse por código normalizado y validarse también con el nombre. Nunca debe
compararse `sourceSeriesId` directamente con `episode.id`.

### 3.3 Datos de juego

| Concepto      | JSON estático      | One Piece API observada                       | Modelo canónico           | Correspondencia                                                                             |
| ------------- | ------------------ | --------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| Tipo de carta | `category`         | No hay campo equivalente fiable               | `game.card_type`          | Solo puede completarse desde JSON. `type=singles` no equivale a `LEADER`, `CHARACTER`, etc. |
| Color         | `colors: string[]` | `color: string \| null`                       | `color` y `game.colors[]` | Alta fiabilidad, separando combinaciones como `Red/Green`.                                  |
| Rareza        | `rarity` abreviada | `rarity` descriptiva o mixta                  | `rarity`                  | Normalizable mediante diccionario.                                                          |
| Coste         | `cost`             | No observado                                  | `game.cost`               | Sin correspondencia actual en la API.                                                       |
| Poder         | `power`            | No observado                                  | `game.power`              | Sin correspondencia actual en la API.                                                       |
| Vidas         | `life`             | `hp` existe, pero se ha observado como `null` | `game.life`               | No se debe equiparar `hp` a `life` sin confirmación contractual.                            |
| Counter       | `counter`          | No observado                                  | `game.counter`            | Sin correspondencia actual.                                                                 |
| Atributos     | `attributes[]`     | No observados                                 | `game.attributes[]`       | Solo JSON.                                                                                  |
| Traits        | `traits[]`         | No observados                                 | `game.traits[]`           | Solo JSON.                                                                                  |
| Efecto        | `effect`           | No observado                                  | `game.effect`             | Solo JSON.                                                                                  |
| Trigger       | `trigger`          | No observado                                  | `game.trigger`            | Solo JSON.                                                                                  |
| Supertype     | No existe          | `supertype`, normalmente `null` en la muestra | `supertype` opcional      | Se conserva como metadato API, sin usarlo como sustituto de `category`.                     |

La web de la API anuncia datos completos de juego, pero ni el ejemplo público ni las respuestas
reales revisadas exponen actualmente coste, poder, efecto o tipo funcional de carta. La
normalización debe basarse en el contrato y la respuesta observada, no en esa descripción
comercial.

### 3.4 Rareza

Los vocabularios de rareza son distintos. Se recomienda un enum canónico independiente de ambos:

| JSON estático | API habitual            | Valor canónico sugerido |
| ------------- | ----------------------- | ----------------------- |
| `C`           | `Common`                | `COMMON`                |
| `UC`          | `Uncommon`              | `UNCOMMON`              |
| `R`           | `R` o `Rare`            | `RARE`                  |
| `SR`          | `SUPER RARE`            | `SUPER_RARE`            |
| `SEC`         | `SECRET RARE`           | `SECRET_RARE`           |
| `L`           | `LEADER`                | `LEADER`                |
| `P`           | `PROMO`                 | `PROMO`                 |
| `TR`          | `TREASURE RARE`         | `TREASURE_RARE`         |
| `SP CARD`     | `SPECIAL` o equivalente | `SPECIAL`               |

Debe conservarse también `rarity_raw` para evitar perder valores nuevos o desconocidos.

### 3.5 Versiones, impresiones y artes

| Concepto          | JSON estático                                            | One Piece API                        | Modelo canónico               | Correspondencia                                      |
| ----------------- | -------------------------------------------------------- | ------------------------------------ | ----------------------------- | ---------------------------------------------------- |
| Tipo de versión   | `variant.type`: `base`, `parallel`, `reprint`, `unknown` | No existe tipo semántico equivalente | `artworks[].variant_type`     | Parcial.                                             |
| Número de versión | `variant.number`                                         | `version`, por ejemplo `V.1`, `V.2`  | Etiqueta y metadato del arte  | Normalizable como número/etiqueta, no como tipo.     |
| Agrupación        | `baseCardId`                                             | Mismo `card_number`                  | `base_card_id` y `artworks[]` | Alta fiabilidad para agrupar impresiones.            |
| ID de impresión   | `sourceId`                                               | `id`                                 | `artworks[].external_id`      | Único solo dentro del proveedor.                     |
| Imagen del arte   | `imageUrl`                                               | `image`                              | `artworks[].image`            | Directa.                                             |
| Precio por arte   | No disponible                                            | `prices` por registro                | `artworks[].prices`           | Exclusivo de la API.                                 |
| Artista por arte  | No disponible                                            | `artist`                             | `CardArtwork.artist`          | Se conserva por impresión, no solo en la carta base. |

`V.1` no garantiza que una carta sea el arte base y `V.2` no garantiza que sea una paralela. Para
clasificar una impresión como `PARALLEL`, `REPRINT`, `MANGA`, etc., hace falta una regla adicional o
un dato explícito del proveedor. Sin él, el valor correcto es `UNKNOWN` o `PRINT_VARIANT`.

### 3.6 Precios y mercado

| Concepto         | JSON estático | One Piece API                            | Modelo canónico                | Correspondencia                  |
| ---------------- | ------------- | ---------------------------------------- | ------------------------------ | -------------------------------- |
| Cardmarket ID    | No existe     | `cardmarket_id`                          | `cardmarket_id`                | Solo API.                        |
| TCGPlayer ID     | No existe     | `tcgplayer_id`                           | `tcgplayer_id`                 | Solo API.                        |
| TCGGO ID         | No existe     | `tcgid`                                  | `tcgid`                        | Solo API.                        |
| Cardmarket       | No existe     | `prices.cardmarket`                      | `prices.cardmarket`            | Solo API.                        |
| TCGPlayer        | No existe     | `prices.tcg_player` en la respuesta real | `prices.tcgplayer` normalizado | El adaptador acepta ambos alias. |
| Enlaces externos | No existen    | `links.cardmarket`, `links.tcgplayer`    | `links`                        | Solo API.                        |
| URL TCGGO        | No existe     | `tcggo_url`                              | `tcggo_url`                    | Solo API.                        |

La respuesta real añade en Cardmarket:

- `lowest_near_mint`
- `lowest_near_mint_EU_only`
- `lowest_near_mint_FR`
- `lowest_near_mint_FR_EU_only`
- `30d_average`
- `7d_average`
- `available_items`
- `graded[]`

El modelo actual solo representa una parte. Además, debe corregirse la compatibilidad entre
`tcg_player` —respuesta observada— y `tcgplayer` —nombre previsto inicialmente— para no perder el
precio de TCGPlayer.

### 3.7 Campos exclusivos

Campos relevantes exclusivos del JSON:

- `baseCardId`
- `category`
- `cost`, `life`, `power`, `counter`
- `attributes[]`, `traits[]`
- `effect`, `trigger`
- `contentFingerprint`
- Pertenencia a varias entradas de `sets[]`

Campos relevantes exclusivos de la API:

- `name_numbered`, `slug`, `card_code_number`
- `version`, `hp`, `supertype`, `tcgid`
- `cardmarket_id`, `tcgplayer_id`
- `prices`
- `artist`
- `tcggo_url`, `links`
- Fecha, logo, slug, serie, totales y valoración de la expansión

## 4. Relación de filtros

### 4.1 Matriz de capacidades

| Filtro        | JSON estático                    | One Piece API                                                         | ¿Normalizable?                            | Consideraciones                                                          |
| ------------- | -------------------------------- | --------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| Expansión     | Sí, localmente sobre `sets[].id` | Sí, server-side mediante `episode_id`                                 | Sí, alta fiabilidad                       | Crear un registro de equivalencias entre código canónico e ID de API.    |
| Color         | Sí, localmente sobre `colors[]`  | El dato existe en `color`, pero no hay filtro server-side documentado | Sí para el dato; parcial para la consulta | Filtrar solo una página de la API produciría totales incorrectos.        |
| Tipo de carta | Sí, sobre `category`             | No hay equivalente fiable                                             | Solo mediante enriquecimiento con JSON    | No usar `type=singles`; describe el producto.                            |
| Rareza        | Sí, sobre `rarity`               | El dato existe, pero no hay filtro server-side documentado            | Sí mediante diccionario                   | Requiere indexado local o descarga exhaustiva para resultados completos. |
| Versión       | Sí, sobre `variant.type`         | Existe `version`, sin filtro server-side documentado                  | Parcial                                   | `version` identifica impresión, no su clase semántica.                   |
| Coste         | Sí, sobre `cost`                 | No observado ni filtrable                                             | Solo mediante enriquecimiento con JSON    | Las cartas sin correspondencia estática quedarían con coste desconocido. |
| Poder         | Sí, sobre `power`                | No observado ni filtrable                                             | Solo mediante enriquecimiento con JSON    | Mismo límite que coste.                                                  |

### 4.2 Parámetros server-side de One Piece API

Según el documento OpenAPI revisado, `GET /cards` permite:

- `search`
- `name`
- `ids`
- `cardmarket_ids` / `cardmarket_id`
- `tcgplayer_ids` / `tcgplayer_id`
- `card_number`
- `episode_id`
- `artist_id`
- `sort`
- `per_page`
- `page`

Los órdenes disponibles incluyen relevancia, precio, número de carta y antigüedad de expansión.
No se documentan parámetros directos para color, rareza, tipo funcional, versión, coste o poder.

### 4.3 Comportamiento recomendado en la interfaz

- JSON estático: habilitar todos los filtros solicitados.
- API sin índice local: habilitar búsqueda, expansión, paginación y órdenes soportados.
- API con caché/índice completo: habilitar color y rareza como filtros locales.
- API enriquecida con JSON: habilitar además tipo, coste y poder, indicando que esos valores
  proceden del catálogo estático.
- Versión: mostrarla siempre como filtro de impresión; no presentarla como `parallel` o `reprint`
  salvo que exista clasificación confirmada.

## 5. Propuesta de normalización

### 5.1 Modelo por capas

Conviene separar:

1. **DTO crudo por proveedor**
   - `StaticCatalogCard`
   - `OnePieceApiCard`
2. **Registro canónico**
   - identidad, expansión, color, rareza y datos de presentación normalizados
3. **Datos de juego**
   - categoría, coste, poder, efecto, etc.
4. **Impresiones**
   - arte, versión, artista, IDs de mercado y precios
5. **Procedencia por campo**
   - proveedor, ID externo, fecha y nivel de confianza

Ejemplo conceptual:

```ts
interface NormalizedCard {
  key: string; // card_number normalizado
  cardNumber: string;
  name: string;
  expansionCode: string;
  colors: CanonicalColor[];
  rarity: CanonicalRarity | 'UNKNOWN';
  game: {
    type?: CanonicalCardType;
    cost?: number;
    power?: number;
    life?: number;
    counter?: number;
    effect?: string;
  };
  prints: NormalizedPrint[];
  provenance: FieldProvenance;
}
```

### 5.2 Algoritmo de enriquecimiento

1. Normalizar `cardNumber` y `card_number`.
2. Agrupar todas las impresiones de la API por `card_number`.
3. Buscar en el JSON todas las filas con el mismo `baseCardId`/`cardNumber`.
4. Comprobar que nombre y código de expansión son compatibles.
5. Copiar desde el JSON:
   - tipo de carta
   - coste
   - poder
   - vidas
   - counter
   - atributos
   - traits
   - efecto y trigger
6. Copiar desde la API:
   - precios
   - artista
   - IDs y enlaces de mercado
   - metadatos de expansión
   - imagen de cada impresión
7. Mantener todos los valores crudos y su proveedor.
8. Si hay conflicto o varias coincidencias funcionalmente distintas, no inferir: marcar el campo
   como desconocido y registrar el conflicto.

### 5.3 Niveles de confianza sugeridos

| Nivel        | Ejemplos                                                                        |
| ------------ | ------------------------------------------------------------------------------- |
| Exacto       | ID externo dentro de su proveedor, `card_number`, imagen del mismo registro     |
| Alto         | Nombre, color, rareza normalizada, expansión por código validado                |
| Medio        | Correspondencia de versión por posición/número                                  |
| Bajo         | Inferir tipo de carta desde rareza                                              |
| No permitido | Tratar `type=singles` como tipo funcional o tratar `hp` como vidas sin contrato |

## 6. Limitaciones operativas

- El plan gratuito de la API tiene límites de peticiones; un índice completo debe cachearse y
  actualizarse por lotes.
- Filtrar localmente solo la página visible de la API es incorrecto porque altera el total y puede
  ocultar coincidencias en otras páginas.
- El catálogo estático y la API pueden actualizarse en fechas distintas.
- Una expansión nueva puede existir en la API y no estar todavía en el JSON. En ese caso no habrá
  coste, poder ni tipo funcional hasta actualizar el catálogo estático.
- Las URLs, precios y disponibilidad son datos dinámicos; no deben formar parte de la identidad de
  una carta.
- Las variantes requieren una taxonomía propia. El número de versión de la API no basta para
  distinguir paralelas, mangas o reimpresiones.

## 7. Conclusión

El mapeo es viable y recomendable si se entiende como una unión enriquecida, no como una conversión
uno-a-uno:

- El JSON debe actuar como fuente principal de datos funcionales del juego.
- One Piece API debe aportar precios, mercados, artistas, imágenes y metadatos dinámicos.
- `card_number` normalizado debe ser la clave de unión funcional.
- Los IDs de cada proveedor deben conservarse por separado.
- Los filtros deben declararse por capacidad del proveedor.
- Los campos ausentes no deben inventarse; pueden enriquecerse desde la otra fuente indicando su
  procedencia.

Con esta arquitectura se pueden ofrecer filtros uniformes sobre el modelo canónico, pero tipo,
coste y poder solo serán completos para las cartas que tengan una correspondencia válida en el
catálogo JSON.

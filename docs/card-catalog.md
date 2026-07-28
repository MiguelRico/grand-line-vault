# Catálogo híbrido Firestore + TCGGO

## Arquitectura

El catálogo activo separa la proyección de búsqueda del detalle:

```text
React → CatalogUseCases
        ├─ índice: CatalogIndexRepository → API propia → Firestore
        └─ detalle: CardDetailRepository
                    ├─ real → API propia → cliente TCGGO → mapper → CardDetail
                    └─ mock → datos del índice → CardDetail completo simulado
```

Los componentes no conocen el formato de TCGGO y nunca lo consultan directamente. La
implementación activa es `HybridCatalogRepository`; sustituir el proveedor requiere otra
implementación de los puertos definidos en `src/domain/repositories.ts`.

## Detalle mock

`VITE_USE_MOCK_CARD_DETAIL=true` selecciona `MockCardDetailRepository` en la composición de
dependencias. El componente React utiliza el mismo caso de uso y el mismo modelo `CardDetail` con
ambos proveedores.

En este modo:

- no se ejecuta ninguna petición HTTP de detalle ni se registra un identificador TCGGO;
- se conservan la imagen, coste, vidas, poder y counter de `CatalogCard`;
- se rellenan artista, mercados, precios, enlaces, expansión, efectos, trigger, DON!!,
  procedencia, impresiones y artes con valores simulados;
- las variantes simuladas se resuelven desde memoria;
- la interfaz avisa si `totalVariants` del índice supera las impresiones devueltas.

El valor predeterminado es `false`, por lo que retirar la variable reactiva el repositorio real sin
modificar la UI. Esta variable no contiene secretos; las credenciales TCGGO continúan siendo
exclusivamente variables de servidor.

## Modelos

- `CatalogCard`: proyección mínima del listado.
- `CardDetail`: ficha completa construida desde el DTO de TCGGO.
- `CardVariant`: variante o arte seleccionable.
- `Printing`: impresión o reimpresión.
- `Price`: precio normalizado.

`CatalogCard` no contiene habilidades, trigger, DON!!, variantes completas, imágenes de variantes
ni precios. Los snapshots de la colección se validan contra el esquema actual y conservan sus
identificadores normalizados de carta, impresión y proveedor.

## Índice de Firestore

El endpoint `/api/catalog?action=index` consulta exclusivamente:

- `catalogIndex`: documentos mínimos, campos de ordenación, prefijos y facetas.
- `catalogSets`: expansiones disponibles.

La paginación utiliza cursores estables formados por el campo de ordenación y el ID del documento.
Los filtros se aplican sobre los campos normalizados de la proyección y los índices compuestos de
búsqueda están declarados en `firestore.indexes.json`.

## Detalle y caché

Al abrir una carta se toma `tcggoId` del índice y se ejecuta
`/api/catalog?action=detail&id=...`. El cliente de servidor aplica autenticación, limitación de
frecuencia, timeout, reintentos exponenciales y errores normalizados. Después, el mapper transforma
el DTO a `CardDetail`.

`ExpiringLocalCache` es el único servicio de caché del detalle. Su TTL se configura con
`VITE_CARD_DETAIL_CACHE_TTL_MS`. Un fallo conserva la información básica de `CatalogCard` y permite
reintentar sin bloquear la aplicación.

## Construcción del índice

El scraper de `scraper/` genera los JSON versionados de `public/catalog` desde la web oficial. El
bootstrap protegido de `/api/catalog` agrupa las impresiones por carta y reconstruye:

- `catalogIndex`, con los datos mínimos del listado, filtros y conteo de variantes;
- `catalogSets`, con las expansiones disponibles.

La operación no consulta TCGGO. Los datos completos se obtienen únicamente al abrir el detalle
cuando el proveedor real está activo.

## Variables de servidor

Preferidas:

- `TCGGO_API_KEY`
- `TCGGO_API_BASE_URL`

Ninguna clave debe usar el prefijo `VITE_`.

## Catálogo estático oficial

Los JSON versionados son la entrada canónica del índice y alimentan también las estadísticas del
catálogo. No son una fuente alternativa seleccionable desde Ajustes.

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
ni precios. Los snapshots de la colección mantienen su esquema versionado y sus identificadores de
origen, por lo que los registros ya persistidos continúan siendo válidos.

## Índice de Firestore

El endpoint `/api/catalog?action=index` consulta exclusivamente:

- `catalogIndex`: documentos mínimos, campos de ordenación, prefijos y facetas.
- `catalogSets`: expansiones disponibles.

La paginación utiliza cursores estables formados por el campo de ordenación y el ID del documento.
Los rangos de coste y poder se materializan como facetas booleanas durante la sincronización para
evitar consultas de desigualdad incompatibles con otras ordenaciones. Los índices compuestos de
búsqueda están declarados en `firestore.indexes.json`.

## Detalle y caché

Al abrir una carta se toma `tcggoId` del índice y se ejecuta
`/api/catalog?action=detail&id=...`. El cliente de servidor aplica autenticación, limitación de
frecuencia, timeout, reintentos exponenciales y errores normalizados. Después, el mapper transforma
el DTO a `CardDetail`.

`ExpiringLocalCache` es el único servicio de caché del detalle. Su TTL se configura con
`VITE_CARD_DETAIL_CACHE_TTL_MS`. Un fallo conserva la información básica de `CatalogCard` y permite
reintentar sin bloquear la aplicación.

## Sincronización

`google-apps-script/catalog-sync` contiene un proceso independiente del frontend. Recorre TCGGO,
agrupa impresiones por número de carta y actualiza:

- cartas y expansiones nuevas;
- miniaturas;
- campos filtrables;
- artista;
- número y clases de variantes;
- prefijos y campos auxiliares de ordenación.

Nunca persiste efectos, triggers, DON!!, precios, históricos, variantes completas ni imágenes de
variantes. Consulta su README para configurar Script Properties, ejecutar la carga inicial e
instalar el trigger diario.

## Variables de servidor

Preferidas:

- `TCGGO_API_KEY`
- `TCGGO_API_BASE_URL`

Los nombres históricos `ONE_PIECE_API_KEY` y `ONE_PIECE_API_BASE_URL` se aceptan temporalmente para
no romper despliegues existentes. Ninguna clave debe usar el prefijo `VITE_`.

## Catálogo histórico

Los JSON y adaptadores estáticos anteriores permanecen únicamente por compatibilidad y por sus
pruebas de migración. `ServicesProvider` no los instancia, Ajustes no permite seleccionarlos y el
flujo activo no los descarga.

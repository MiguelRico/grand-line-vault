# Contratos de proveedores

Verificado el 24 de julio de 2026.

## Arjunkai OPTCG

Endpoints implementados: `GET /cards`, `GET /cards/{id}` y `GET /sets`. Filtros implementados según su README: set, color, categoría, rareza, variante, poder, coste, precio, orden y paginación. Los campos `parallel`, `variant_type`, `base_id`, `price`, `price_source`, `price_updated_at` y `tcg_ids` son mapeados sin heurísticas por nombre.

La instancia pública documentada no es abierta para consumidores arbitrarios: exige origen permitido o API key. El endpoint permanece vacío por defecto.

## OPTCG API

Endpoints implementados: `GET /sets/filtered/`, `GET /sets/card/{card_id}/`, `GET /allSets/`. La documentación indica consumo GET sin autenticación. Se verificó que un código puede devolver carta base y paralelas, diferenciadas por `card_image_id`.

La API no pagina estos endpoints; la fachada pagina tras normalizar. Las capacidades publicadas por `/providers` reflejan esta diferencia.

## Reconciliación

No se fusionan cartas por nombre. El código oficial crea el ID base. Las variantes usan el `card_image_id` o ID estructurado del proveedor. Si se enriquece un registro, `CardDataMerger` conserva procedencia y no elimina datos válidos.

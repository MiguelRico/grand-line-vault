# Autenticación y colección local

## Composición actual

```text
React
  ├─ AuthProvider ── Firebase Authentication
  │                    └─ users/{uid} (perfil gratuito en Firestore)
  └─ CollectionService
       ├─ CollectionRepository ── IndexedDbCollectionRepository (Dexie)
       └─ CatalogUseCases ─────── índice mínimo del catálogo
```

Los componentes consumen `CollectionService`. No acceden a Dexie, IndexedDB ni a documentos de
Firestore.

## Límite de persistencia

`CollectionEntry` contiene únicamente:

- `ownerId`;
- referencia `catalogCardId`;
- referencia opcional `catalogVariantId`;
- cantidad, idioma, estado, favorito y ubicación;
- precio de adquisición y notas introducidos por el usuario;
- fechas de creación y actualización.

La carta hidratada (`CollectionItem.card`) y la variante (`CollectionItem.variant`) son modelos de
lectura obtenidos desde el índice. El repositorio reconstruye una lista cerrada de campos antes de
cada escritura. Por tanto, precios, disponibilidad, enlaces o cualquier otro enriquecimiento de
TCGGO no pueden almacenarse accidentalmente.

## Evolución prevista

Una futura sincronización puede implementar `CollectionRepository` de forma remota o componer una
implementación local y otra remota. Los componentes y el modelo persistente no necesitan cambiar.

Los campos de perfil `premium`, `cloudSync` y `adsEnabled` representan capacidades futuras. En esta
fase no activan comportamiento:

```text
premium=false
cloudSync=false
adsEnabled=true
```

Las reglas de Firestore no permiten que el cliente modifique estas capacidades.

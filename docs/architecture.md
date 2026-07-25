# Decisiones de arquitectura

## Límites

- `domain`: entidades y reglas sin React, HTTP, Firebase ni proveedores.
- `infrastructure`: adaptadores de catálogo y datos privados.
- `features`: pantallas y composición.
- `api`: confianza del servidor, sesión, validación y Firebase Admin.
- `apps-script`: anti-corruption layer de proveedores externos.

## Evolución multiusuario

La sesión ya expone una identidad/rol. Para evolucionar, añade `userId` al JWT, cambia las rutas Firestore a `users/{userId}/collectionItems`, `storageBoxes` y `salesPacks`, y deriva siempre el path desde la sesión. Las entidades del dominio y los componentes no cambian.

## Consistencia

La agrupación de inventario usa carta interna, variante, idioma y condición. Cada entrada puede ubicarse en una caja y sección. Los packs conservan snapshots, reservan cantidades por entrada y avisan cuando el total reservado supera las copias disponibles.

## Seguridad

El navegador solo recibe variables `VITE_*`. Firestore bloquea clientes. Las Vercel Functions validan sesión, tamaño e input antes de acceder a Admin SDK. El catálogo público se sirve como archivos estáticos y no necesita credenciales.

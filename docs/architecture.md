# Decisiones de arquitectura

## Límites

- `domain`: entidades y reglas sin React, HTTP, Firebase ni proveedores.
- `infrastructure`: adaptadores de catálogo y datos privados.
- `features`: pantallas y composición.
- `api`: confianza del servidor, sesión, validación y Firebase Admin.
- `apps-script`: anti-corruption layer de proveedores externos.

## Evolución multiusuario

La sesión ya expone una identidad/rol. Para evolucionar, añade `userId` al JWT, cambia las rutas Firestore a `users/{userId}/collectionItems`, `decks` y `tradeItems`, y deriva siempre el path desde la sesión. Las entidades del dominio y los componentes no cambian.

## Consistencia

La agrupación de colección usa carta interna, variante, idioma y condición. Las cantidades intercambiables nunca exceden el total. Los mazos conservan un snapshot y avisan cuando utilizan más copias de las disponibles.

## Seguridad

El navegador solo recibe variables `VITE_*`. Firestore bloquea clientes. Las Vercel Functions validan sesión, tamaño e input antes de acceder a Admin SDK. Apps Script conserva credenciales en Script Properties y sus logs solo registran códigos y metadatos sanitizados.

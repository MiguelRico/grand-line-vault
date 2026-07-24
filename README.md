# Grand Line Vault

Aplicación privada y responsive para consultar el catálogo de One Piece Card Game y gestionar una colección, mazos, favoritos e intercambios. Está construida con React, TypeScript estricto, Vite, TanStack Query, React Hook Form, Zod, Tailwind, Radix UI, Vercel Functions, Firebase Admin y Google Apps Script.

La identidad visual es original y provisional. Las cartas se cargan desde la URL del proveedor; el repositorio no contiene imágenes ni logotipos oficiales.

## Estado

- Modo mock completo y ejecutable sin servicios externos.
- Login propio de desarrollo (`nakama`), catálogo, filtros, detalle, colección, cantidades, favoritos, intercambiables, notas, mazos, estadísticas y exportación.
- API privada con sesión firmada HttpOnly y Firebase Admin.
- Fachada de catálogo modular para Apps Script, con Arjunkai como principal configurable y OPTCG API como fallback.
- UI mobile-first usable desde 320 px, modal en escritorio y bottom sheet en móvil.
- TypeScript, ESLint, Vitest y build verificados.

## Arquitectura

```text
React + Vite
├── Catálogo ─────────────── Google Apps Script
│                            ├── Registry / Selector / Fallback
│                            ├── Cache / Retry / Circuit Breaker
│                            ├── Arjunkai OPTCG
│                            └── OPTCG API
├── Login ────────────────── Vercel Functions
├── Colección ────────────── Vercel Functions ── Firebase Admin ── Firestore
├── Mazos ────────────────── Vercel Functions ── Firebase Admin ── Firestore
└── Intercambios/estadística Vercel Functions ── Firebase Admin ── Firestore
```

React nunca conoce el formato original de un proveedor ni accede a Firestore. Los componentes consumen repositorios normalizados; cambiar de mock a servicios reales no introduce condicionales en la UI.

## Inicio rápido

Requisitos: Node.js 22 o superior.

```bash
npm install
copy .env.example .env.local
npm run dev
```

La configuración de ejemplo activa `VITE_USE_MOCK_DATA=true`. Abre `http://localhost:5173` y usa la contraseña `nakama`. La sesión mock vive únicamente en `sessionStorage`; ninguna contraseña se persiste en el navegador.

Comprobaciones:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Variables

Variables públicas, incluidas en el bundle:

| Variable | Uso |
| --- | --- |
| `VITE_APP_NAME` | Nombre visible |
| `VITE_APPS_SCRIPT_URL` | URL `/exec` del Web App de Apps Script |
| `VITE_USE_MOCK_DATA` | Activa repositorios mock |
| `VITE_DEFAULT_CURRENCY` | Moneda de presentación |
| `VITE_DEFAULT_PAGE_SIZE` | Tamaño de página |

Variables privadas de Vercel:

| Variable | Uso |
| --- | --- |
| `APP_PASSWORD_HASH` | Hash bcrypt, nunca la contraseña |
| `SESSION_SECRET` | Secreto aleatorio de al menos 32 caracteres |
| `SESSION_TTL_SECONDS` | Duración de la sesión |
| `FIREBASE_PROJECT_ID` | Proyecto Firebase |
| `FIREBASE_CLIENT_EMAIL` | Cuenta de servicio |
| `FIREBASE_PRIVATE_KEY` | Clave PEM; `\n` escapados son admitidos |

Genera el hash:

```bash
npm run hash-password -- "una contraseña larga y única"
```

No uses el prefijo `VITE_` para secretos.

## Firebase

1. Crea un proyecto y una base Firestore.
2. Crea una cuenta de servicio con acceso mínimo al proyecto.
3. Configura las tres variables privadas de Firebase en Vercel.
4. Despliega reglas e índices:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

`firestore.rules` bloquea todo acceso cliente. Firebase Admin, ejecutado en servidor tras validar la sesión, no depende de esas reglas.

Colecciones:

```text
app/settings
collectionItems/{collectionItemId}
decks/{deckId}
decks/{deckId}/cards/{deckCardId}   # preparado para crecimiento
tradeItems/{tradeItemId}            # preparado para datos auxiliares
```

Los elementos guardan un snapshot de nombre, código, set, imagen y precio. Colección, mazos e intercambios siguen siendo legibles si el catálogo está caído.

## Vercel

1. Importa el repositorio.
2. Framework preset: Vite.
3. Añade las variables públicas y privadas.
4. Despliega.

Las rutas `/api/auth/*` crean y eliminan una cookie `HttpOnly`, `SameSite=Strict`, `Secure` en producción y con expiración. Las APIs privadas llaman a `requireSession`, validan el payload con Zod, limitan tamaño y no devuelven stack traces.

El rate limiting del login es básico y por instancia serverless. Para tráfico elevado, sustituye el `Map` en memoria por un almacén distribuido como Vercel KV/Upstash sin cambiar el contrato.

## Google Apps Script y clasp

Consulta [apps-script/README.md](apps-script/README.md). Resumen:

```bash
npm run clasp:push
npm run clasp:deploy
```

La Web App ofrece:

```text
?resource=cards
?resource=card&id=BASE::OP01-001
?resource=card&code=OP01-001
?resource=sets
?resource=metadata
?resource=providers
?resource=health
```

## Proveedores verificados el 24-07-2026

| Proveedor | Rol | API key | Variantes | Precios | Fallback |
| --- | --- | ---: | ---: | ---: | ---: |
| Arjunkai OPTCG | Principal | Configurable/requerida en la instancia pública | Sí | Sí, USD y procedencia | No |
| OPTCG API | Secundario | No en la API pública documentada | Sí | Sí, USD | Sí |
| Mock | Desarrollo | No | Sí | Sí | Desarrollo |

Arjunkai documenta `/cards`, `/cards/{id}`, `/sets`, filtros, paginación, variantes y precios. Su instancia desplegada restringe orígenes y exige `X-API-Key` fuera de su allowlist. Por eso `ARJUNKAI_API_BASE_URL` no tiene un valor por defecto y el proveedor solo se considera configurado con endpoint y credencial, salvo que se habilite explícitamente el acceso no autenticado para una instancia propia.

OPTCG API documenta endpoints GET sin autenticación. La implementación usa `/sets/filtered/`, `/sets/card/{id}/` y `/allSets/`, cuyas respuestas se verificaron durante la integración. Como no pagina, Apps Script normaliza, filtra y pagina el resultado; es un fallback de menor riqueza y marca `partialData=true`.

Fuentes primarias:

- [Repositorio y contrato de Arjunkai OPTCG](https://github.com/arjunkai/optcg-api)
- [Documentación de OPTCG API](https://optcgapi.com/documentation)

## IDs, variantes y reconciliación

- Carta base: `BASE::{CARD_CODE}`.
- Variante: `VARIANT::{CARD_CODE}::{VARIANT_KEY}`.
- El nombre nunca se usa como identidad.
- Los mappers conservan proveedor, ID externo y fecha de consulta.
- `CardDataMerger` no sustituye valores válidos por nulos y conserva procedencia.
- `CardPriceResolver` mantiene moneda, fuente, fecha y producto.
- Solo se clasifican variantes por campos o IDs estructurados proporcionados.

## Caché, fallback y salud

El navegador usa TanStack Query. Apps Script usa `CacheService` con claves que incluyen versión de mapper, proveedor, operación y hash de parámetros. No se cachean fallos ni respuestas demasiado grandes.

Errores temporales (`429`, `500`, `502`, `503`, `504`, red o JSON inválido) admiten retry limitado y fallback. Errores funcionales, parámetros inválidos y autenticación incorrecta no lo hacen. Tras el umbral configurado, el circuito pasa de `CLOSED` a `OPEN` y más tarde a `HALF_OPEN`.

`?resource=providers` muestra estado y capacidades sin claves. `?resource=health` informa disponibilidad, latencia y circuito.

## Imágenes y precios

- Las imágenes se cargan con `loading="lazy"`, relación 5:7, alt y placeholder de error.
- No se copian a Firebase Storage.
- El snapshot conserva la URL usada al añadir una carta.
- Un precio siempre incluye moneda y fuente; cuando existe, también fecha.
- No se convierten monedas silenciosamente.
- La valoración se presenta como orientativa y separada del precio de adquisición.

## Rendimiento y accesibilidad

- Rutas y módulos secundarios cargados bajo demanda.
- Búsqueda con debounce y cancelación mediante `AbortSignal`.
- Paginación y `staleTime` de catálogo.
- Focus trap, Escape, restauración de foco y bloqueo de scroll mediante Radix.
- Targets táctiles de 44 px, etiquetas, estados `aria-live`, foco visible y reduced motion.
- Sidebar en escritorio; drawer, grid de dos columnas y bottom sheets con safe areas en móvil.

## Autoalojar o cambiar Arjunkai

El código del proveedor es MIT y documenta ejecución con Cloudflare Workers/D1. Despliega una instancia siguiendo su repositorio y configura:

```text
ARJUNKAI_API_BASE_URL=https://tu-worker.example
ARJUNKAI_API_KEY=...
ARJUNKAI_API_KEY_HEADER=X-API-Key
ARJUNKAI_ENABLED=true
```

Para una instancia propia que no exige key, establece `ARJUNKAI_ALLOW_UNAUTHENTICATED=true`. Cambiar el endpoint o deshabilitar el proveedor no requiere recompilar React; se hace en Script Properties.

## Troubleshooting

- **Catálogo vacío:** revisa `VITE_APPS_SCRIPT_URL`, el despliegue `/exec` y `?resource=health`.
- **Arjunkai 401/403:** configura `X-API-Key` o utiliza una instancia autoalojada; el fallback debe seguir operativo.
- **Firestore no configurado:** comprueba saltos de línea de `FIREBASE_PRIVATE_KEY`.
- **Sesión rechazada:** `SESSION_SECRET` debe tener al menos 32 caracteres y el hash debe ser bcrypt.
- **Imagen rota:** se muestra placeholder; la URL externa puede haber caducado.
- **Índice requerido:** despliega `firestore.indexes.json`.

## Limitaciones

- Es una aplicación para un único propietario; el dominio ya separa infraestructura para evolucionar a `users/{userId}`.
- El fallback OPTCG API no ofrece paginación nativa y su cobertura/campos pueden ser menores.
- Apps Script Web Apps no permiten fijar cabeceras CORS personalizadas con `ContentService`; despliega el frontend y el script con la configuración de acceso adecuada. Si se requiere una allowlist HTTP estricta, añade un proxy de catálogo en Vercel.
- El circuit breaker usa caché efímera de Apps Script y es deliberadamente simple.
- El valor mezcla únicamente precios de la misma moneda; no hay conversión automática.
- Las reglas oficiales completas de construcción de mazos se reservan para una evolución de `DeckValidationService`; actualmente valida disponibilidad.

## Propiedad intelectual

One Piece, One Piece Card Game, personajes y artes pertenecen a sus respectivos titulares, incluidos Eiichiro Oda, Shueisha, Toei Animation y Bandai. Este proyecto no está afiliado ni respaldado por ellos. Utiliza los datos e imágenes respetando las condiciones de los proveedores y apoya el producto oficial.

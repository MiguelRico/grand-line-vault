# Autenticación y sincronización privada

## Composición

```text
React
  ├─ AuthProvider ── Firebase Authentication
  │                    └─ users/{uid} (perfil observado en tiempo real)
  └─ Servicios privados
       ├─ cuenta local ───── IndexedDB + localStorage
       └─ premium + sync ─── Firestore + espejo local
```

La sincronización se habilita exclusivamente cuando `premium` y `cloudSync` valen `true`. Cambiar
solo uno de los dos campos no concede acceso a las subcolecciones remotas. El perfil se observa
con un listener, por lo que el cambio de capacidad no exige cerrar la sesión.

## Rutas remotas

- `users/{uid}/collectionItems/{documentId}`;
- `users/{uid}/wishlistItems/{documentId}`;
- `users/{uid}/storageBoxes/{documentId}`;
- `users/{uid}/salesPacks/{documentId}`;
- `users/{uid}/syncState/{resource}` para registrar la migración inicial.

Las reglas derivan siempre el propietario de la sesión de Firebase y vuelven a comprobar
`premium && cloudSync`. Un cliente no puede modificar esos campos del perfil ni consultar datos de
otro usuario.

## Migración y consistencia

La primera lectura de cada recurso sin marcador combina datos locales y remotos por identificador.
Si existen dos versiones, gana la de `updatedAt` más reciente. Después se crea el marcador y la
copia remota pasa a ser autoritativa. Las lecturas refrescan el espejo local y las escrituras o
borrados se aplican primero en Firestore y después localmente.

El marcador evita que una copia local antigua resucite elementos eliminados desde otro dispositivo.
Al desactivar `cloudSync`, la aplicación vuelve al espejo local sin borrar los documentos remotos.

## Límite de persistencia

Los documentos de colección y deseos contienen referencias estables al catálogo y metadatos del
usuario. Las cajas, secciones y packs usan esquemas cerrados. Ningún repositorio persiste cartas
hidratadas, precios, disponibilidad ni respuestas enriquecidas de TCGGO.

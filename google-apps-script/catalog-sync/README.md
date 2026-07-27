# Sincronizador del índice de catálogo

Este proyecto de Google Apps Script es independiente de la aplicación. Recorre TCGGO y escribe
exclusivamente la proyección ligera de búsqueda en `catalogIndex` y las expansiones en
`catalogSets`. No persiste efectos, triggers, precios, enlaces comerciales ni el detalle de las
impresiones.

Configura estas Script Properties:

- `TCGGO_API_KEY`
- `TCGGO_API_BASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Ejecuta `syncCatalogIndex` para la carga inicial y `installDailyCatalogSync` una sola vez para crear
el trigger diario. La cuenta de servicio debe tener permiso para escribir en Cloud Firestore.


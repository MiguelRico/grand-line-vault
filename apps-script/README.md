# Fachada de catálogo en Google Apps Script

Este directorio se mantiene modular con `clasp`; Apps Script carga los `.gs` en un ámbito compartido aunque estén organizados en carpetas en el repositorio.

## Configuración

1. Instala dependencias con `npm install`.
2. Crea o abre un proyecto Apps Script.
3. Copia `.clasp.json.example` a `.clasp.json` y sustituye el `scriptId`.
4. Ejecuta `setupScriptProperties` una vez desde el editor.
5. En Project Settings > Script Properties, completa el endpoint y credencial de Arjunkai.
6. Ejecuta `npm run clasp:push`.
7. Despliega como Web App, ejecutando como el propietario y con acceso apropiado para el frontend.
8. Copia la URL `/exec` a `VITE_APPS_SCRIPT_URL`.

Propiedades mínimas recomendadas:

```text
CATALOG_PRIMARY_PROVIDER=ARJUNKAI_OPTCG
CATALOG_FALLBACK_PROVIDERS=OPTCG_API
CATALOG_PROVIDER_FALLBACK_ENABLED=true

ARJUNKAI_API_BASE_URL=https://tu-instancia
ARJUNKAI_API_KEY=secreto
ARJUNKAI_API_KEY_HEADER=X-API-Key
ARJUNKAI_ENABLED=true
ARJUNKAI_ALLOW_UNAUTHENTICATED=false

OPTCG_API_BASE_URL=https://optcgapi.com/api
OPTCG_API_ENABLED=true
```

No incluyas API keys en archivos del repositorio.

## Flujo

`Router` valida la entrada y llama a `CatalogService`. El servicio consulta caché normalizada, pide candidatos a `CatalogProviderSelector`, ejecuta el proveedor, valida/mapea y guarda caché. `RetryPolicy`, `CatalogFallbackPolicy` y `CircuitBreaker` controlan degradación. Cada respuesta indica proveedor, caché, fallback y datos parciales.

## Probar

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?resource=health
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?resource=providers
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?resource=cards&query=luffy&page=1&pageSize=24
```

`/providers` nunca devuelve valores de API key.

## Actualizar mappers

Cuando cambie un contrato externo:

1. Actualiza solo el cliente/mapeador del proveedor.
2. Incrementa `CATALOG_CACHE_SCHEMA_VERSION`.
3. Añade fixtures y pruebas del nuevo contrato.
4. Verifica `/health`, búsqueda, detalle, sets, variantes y precios.
5. Crea una nueva implementación de despliegue de Apps Script; no reutilices una URL de prueba para producción.

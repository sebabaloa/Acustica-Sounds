# AcústicaSounds – Backend API

## Overview
- API service located in `apps/api`
- Stack: Node.js, Express, Mongoose, Zod, Vitest
- Auth: email + password with JWT access/refresh tokens

## Prerequisites
- Node.js >= 18
- pnpm
- MongoDB Atlas account with a database named `acustica-sounds`

## Environment Variables (`apps/api/.env`)
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=acustica-sounds
JWT_SECRET=<32+ char random string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<32+ char random string>
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001

# CORS
API_ALLOWED_ORIGINS=http://localhost:3000
PLAYBACK_ALLOWED_ORIGINS=http://localhost:3000

# Incremento 2 — Reproducción segura (playback tokens)
VIDEO_PROVIDER=mux                    # Resolución: track.provider → VIDEO_PROVIDER → 'mux'
MUX_SIGNING_KEY_ID=                   # requerido cuando provider = mux
MUX_SIGNING_KEY_SECRET=               # requerido cuando provider = mux (ver tabla)
MUX_SIGNED_TTL=120                    # TTL por defecto en segundos
MUX_PLAYBACK_BASE=https://stream.mux.com
PLAYBACK_RATELIMIT_PER_MIN=30         # límite por minuto/IP para playback-credentials

# E2E (DB de pruebas)
E2E_MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/acustica-sounds-test?retryWrites=true&w=majority
E2E_MUX_PLAYBACK_ID=                  # playback_id de MUX para pruebas opcionales
```
> Usa la misma estructura en `.env.example` y nunca subas credenciales reales.

| Formato secreto Mux | Ejemplo                                    | Comentario                                    |
| ------------------- | ------------------------------------------ | --------------------------------------------- |
| crudo               | `MUX_SIGNING_KEY_SECRET=sk_live_123`       | Copia literal del dashboard Mux               |
| base64              | `MUX_SIGNING_KEY_SECRET=base64:c2tfbGl2ZQ==` | Prefijo `base64:` + secreto codificado en base64 |

## Install & Run
```bash
pnpm install
pnpm --filter ./apps/api dev
```
La API expone `GET /health` y loguea `API on :3001` al conectar con Atlas.

## Auth Flow
### Registrar usuario
```bash
curl -i -X POST http://localhost:3001/auth/register   -H "Content-Type: application/json"   -d '{"email":"demo@example.com","password":"Secret123!"}'
```
- Respuesta: `201 {"userId":"<mongoId>"}`

### Login
```bash
curl -i -X POST http://localhost:3001/auth/login   -H "Content-Type: application/json"   -d '{"email":"demo@example.com","password":"Secret123!"}'
```
- Respuesta: `200 {"accessToken":"...","refreshToken":"..."}`
- `accessToken` dura `JWT_EXPIRES_IN` (15m por defecto)
- `refreshToken` dura `JWT_REFRESH_EXPIRES_IN` (7d por defecto)

### Perfil autenticado
```bash
curl -i http://localhost:3001/users/me   -H "Authorization: Bearer <accessToken>"
```
- Respuesta: `200` con email, role y timestamps

### Refrescar tokens
```bash
curl -i -X POST http://localhost:3001/auth/refresh   -H "Content-Type: application/json"   -d '{"refreshToken":"<refreshToken>"}'
```
- Respuesta: `200` con nuevo par de tokens
- El refresh viejo se invalida inmediatamente (rotación con `tokenVersion`)

## Tests
```bash
pnpm --filter ./apps/api test
```

### Cómo probar

1. **Variables necesarias**
   - Unit tests: ninguna adicional.
   - E2E (modo básico – solo rutas públicas y errores): `E2E_MONGODB_URI` (o `MONGODB_URI`).
   - E2E (modo completo con Mux firmado): además definir `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_SECRET` (base64) y `E2E_MUX_PLAYBACK_ID`.
   - Opcionales: ajustar `PLAYBACK_RATELIMIT_PER_MIN`, `API_ALLOWED_ORIGINS`, `PLAYBACK_ALLOWED_ORIGINS`.

2. **Comandos**
   ```bash
   # Unit tests + cobertura (≥85%)
   pnpm --filter ./apps/api test:unit

   # Reset base de datos de pruebas (usa E2E_MONGODB_URI)
   pnpm --filter ./apps/api test:prepare:e2e

   # E2E sin Mux (solo policy public + errores)
   pnpm --filter ./apps/api test:e2e

   # E2E completo con Mux (requiere variables Mux + E2E_MUX_PLAYBACK_ID)
   pnpm --filter ./apps/api test:e2e:full

   # Reporte de cobertura (lcov + texto)
   pnpm --filter ./apps/api test:coverage
   ```

3. **Simular expiraciones cortas**
   - Crea un track con `signedTtlSeconds` bajo (por ejemplo, 5) o ajusta temporalmente `MUX_SIGNED_TTL`.
   - Solicita `POST /tracks/:id/playback-credentials`, espera `TTL+1` segundos y vuelve a solicitar para verificar que `expiresAt` rota.

4. **Troubleshooting común**
   - `PROVIDER_CONFIG_ERROR`: verificar signing keys Mux (ID + secret base64).
   - `TOO_MANY_REQUESTS`: aumentar `PLAYBACK_RATELIMIT_PER_MIN` o espaciar llamadas.
   - CORS sin cabecera `Access-Control-Allow-Origin`: añadir dominio a `PLAYBACK_ALLOWED_ORIGINS`.
   - E2E encallado: ejecutar `pnpm --filter ./apps/api test:prepare:e2e` antes de la suite.

## Seed (opcional)
```bash
pnpm --filter ./apps/api seed
```
Genera un `Demo Track` en la base configurada para validaciones rápidas.

### E2E (requires Mongo URI)
Set `E2E_MONGODB_URI` (or fallback `MONGODB_URI`) before running Vitest so the end-to-end suite can hit register → login → tracks using a dedicated database.
Cada ejecución limpia la base llamando a `dropDatabase()`, por lo que se recomienda apuntar a `acustica-sounds-test` o un cluster aislado.

Ejemplo (cluster separado):
```bash
export E2E_MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/acustica-sounds-test?retryWrites=true&w=majority"
pnpm --filter ./apps/api test
```
- 34 pruebas (`auth`, `users/me`, `tracks`, middlewares, e2e`) pasan con Vitest

## Troubleshooting
- `MongooseServerSelectionError`: verifica tu IP en Atlas → Network Access
- `MongoServerError: bad auth`: resetea la contraseña del usuario Atlas y actualiza la URI
- `INVALID_TOKEN`: usa un access token completo y vigente o refresca con `/auth/refresh`

## Tracks (nuevo dominio protegido)
### Listar tracks
```bash
curl -i http://localhost:3001/tracks \
  -H "Authorization: Bearer <accessToken>"
```
- Respuesta: `200 {"tracks":[...]}`

### Crear track
```bash
curl -i -X POST http://localhost:3001/tracks \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Demo","artist":"Artista","duration":180}'
```
- Respuesta: `201 {"track":{...}}`

### Obtener credenciales de reproducción (Incremento 2)
`POST /tracks/:id/playback-credentials`

- **Auth:** Bearer (`verifyJWT`)
- **Resolución de provider:** `track.provider → env.VIDEO_PROVIDER → 'mux'`
- **CORS:** restringido a `PLAYBACK_ALLOWED_ORIGINS` (default `http://localhost:3000`)
- **Rate limit:** `PLAYBACK_RATELIMIT_PER_MIN` por IP (default 30 requests/min)
- **TTL:** precedencia `track.signedTtlSeconds → MUX_SIGNED_TTL → 120s`. Recomendado entre **60 s** y **3600 s**.

#### Ejemplo (policy = `signed`)
```bash
curl -i -X POST http://localhost:3001/tracks/<trackId>/playback-credentials \
  -H "Authorization: Bearer <accessToken>"
```
Respuesta `200`:
```json
{
  "provider": "mux",
  "url": "https://stream.mux.com/<playbackId>.m3u8?token=<JWT>",
  "expiresAt": "2025-10-27T15:05:12.000Z",
  "hints": {
    "policy": "signed",
    "ttlSeconds": 120
  }
}
```

#### Ejemplo (policy = `public`)
```json
{
  "provider": "mux",
  "url": "https://stream.mux.com/<playbackId>.m3u8",
  "expiresAt": null,
  "hints": {
    "policy": "public",
    "ttlSeconds": null
  }
}
```

> `expiresAt` se entrega siempre en formato ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
> Consulta `docs/httpie-playback-demo.sh` para un flujo automático con HTTPie / pnpm.

#### Errores relevantes
| Código | HTTP | Descripción | Recuperación |
| ------ | ---- | ----------- | ------------ |
| `MISSING_PLAYBACK_ID` | 409 | El track no tiene `playbackId` para la policy actual | Asignar `playbackId` o pasar a `policy=public` temporalmente |
| `PROVIDER_CONFIG_ERROR` | 500 | Configuración MUX inválida/incompleta | Revisar `MUX_SIGNING_KEY_ID` y `MUX_SIGNING_KEY_SECRET` (base64) |
| `TOO_MANY_REQUESTS` | 429 | Rate limit alcanzado | Esperar `Retry-After` o elevar `PLAYBACK_RATELIMIT_PER_MIN` |

#### Auditoría
- Se registra en consola: `requestId`, `userId`, `trackId`, `policy`, `expiresAt`
- No se loguea el token firmado

#### Pruebas E2E
- Flujo completo: `register → login → promote admin → POST /tracks → GET /tracks → POST /tracks/:id/playback-credentials`
- Casos MUX condicionales si está configurado `E2E_MUX_PLAYBACK_ID`

## Next Increments
- Crear seeds o UI para gestionar tracks (create/update/delete)
- Añadir CRUD completo para tracks (update/delete) y cobertura e2e
- Exportar colección HTTPie/Postman y automatizar pruebas end-to-end

## Observabilidad
Consulta `docs/OBSERVABILITY.md` para detalles de los contadores y métricas (`api.playback.*`) asociados al endpoint de playback.

## Admin bootstrap
Para crear o ascender un usuario a administrador usa:
```bash
pnpm --filter ./apps/api promote-admin <email> [password]
```
- Si el usuario no existe debes pasar también la contraseña; se creará con rol `admin`.
- Si ya existe, el script actualiza su rol a `admin` y reutiliza su contraseña actual.

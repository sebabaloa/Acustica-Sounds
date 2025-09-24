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
```
> Usa la misma estructura en `.env.example` y nunca subas credenciales reales.

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

## Next Increments
- Crear seeds o UI para gestionar tracks (create/update/delete)
- Añadir CRUD completo para tracks (update/delete) y cobertura e2e
- Exportar colección HTTPie/Postman y automatizar pruebas end-to-end

## Admin bootstrap
Para crear o ascender un usuario a administrador usa:
```bash
pnpm --filter ./apps/api promote-admin <email> [password]
```
- Si el usuario no existe debes pasar también la contraseña; se creará con rol `admin`.
- Si ya existe, el script actualiza su rol a `admin` y reutiliza su contraseña actual.

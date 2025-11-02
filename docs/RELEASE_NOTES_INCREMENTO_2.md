# Incremento 2 — Playback seguro con MUX

## Resumen
- Endpoint protegido `POST /tracks/:id/playback-credentials` con contrato estable para políticas `public` y `signed`.
- Proveedor Mux con firma JWT HS256 (TTL configurable) y validación de signing keys en startup.
- Middleware `errorHandler` y rate limit/CORS específicos para reproducción segura.
- Tests unitarios (MuxProvider, servicio, rutas) y E2E (login → crear → listar → playback + expiración condicional).
- Documentación renovada (.env.example, README backend, ADR-002, objetivos) y colección HTTPie.
- TTL recomendado: entre 60 s y 3600 s; la precedencia es `track.signedTtlSeconds → MUX_SIGNED_TTL → 120s`.

## Qué verificar manualmente
1. Configurar `.env` con las variables MUX (`VIDEO_PROVIDER`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_SECRET`, etc.).
2. Levantar API (`pnpm --filter ./apps/api dev`) y ejecutar script `docs/httpie-playback-demo.sh` con un `playbackId` real.
3. Confirmar que `expiresAt` rota tras el TTL y que los errores incluyen `requestId`.

> **Nota sobre Mux secrets**
> - Usa `MUX_SIGNING_KEY_SECRET=<secreto_crudo>` cuando copias el valor directo del dashboard.
> - Usa `MUX_SIGNING_KEY_SECRET=base64:<valor>` solo si Mux te provee el secreto codificado; ambos formatos son válidos.

## Lecciones
- Mantener el contrato agnóstico de proveedor facilita migrar a Lessons/DRM sin tocar el frontend.
- Validar secretos en startup evita fallos silenciosos durante la demo.

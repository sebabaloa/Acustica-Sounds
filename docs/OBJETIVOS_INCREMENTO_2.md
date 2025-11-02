📘 CONTEXTO DEL PROYECTO
Plataforma de cursos audiovisuales en monorepo con:
- apps/api → Express + Mongoose + Zod + JWT auth
- apps/web → Next.js + Tailwind + ShadCN (frontend)
Objetivo del Incremento 2: implementar la reproducción segura de contenido
audiovisual (por ahora representado como “tracks”) usando MUX firmado y
añadir manejo global de errores coherente.

---

🎯 OBJETIVOS ESPECÍFICOS
1. Mantener `Track` como recurso temporal reproducible.
2. Crear el endpoint POST `/tracks/:id/playback-credentials`
   - contrato agnóstico del proveedor (futuro Lesson compatible)
   - manejo de políticas `public` y `signed`
   - TTL configurable (`MUX_SIGNED_TTL`, por defecto 120 s)
   - respuesta incluye `expiresAt` y `url` completa lista para reproducir
3. Implementar `MuxProvider` que firme playback tokens JWT (HS256).
4. Integrar middleware global `errorHandler` para respuestas unificadas.
5. Añadir pruebas unitarias y E2E básicas del flujo completo.
6. No modificar autenticación ni rutas existentes; solo extender.

---

🧠 HECHOS VERIFICADOS SOBRE MUX  (usar tal cual)
- Cada asset puede tener playback_ids con policy: "public" | "signed" | "drm".
- Reproducción pública: https://stream.mux.com/{PLAYBACK_ID}.m3u8
- Reproducción firmada: https://stream.mux.com/{PLAYBACK_ID}.m3u8?token={JWT}
- JWT firmado con HS256 usando SIGNING_KEY_SECRET (base64) y header.kid = SIGNING_KEY_ID.
- Claims mínimos: sub = PLAYBACK_ID, exp = now + TTL (segundos).
- Access Token (TOKEN_ID/SECRET) → para API (crear assets, playback_ids).
- Signing Key (SIGNING_KEY_ID/SECRET base64) → para firmar JWT de playback.
- TTL inicial = 120 s (ajustable vía MUX_SIGNED_TTL).
- Si expira, el frontend reintenta y solicita nuevo token.
- Playback base: https://stream.mux.com

---

⚙️ ARQUITECTURA A RESPETAR
1. Interfaz `VideoProvider` (base para MUX y futuros DRM):
   getPlaybackUrlByTrack(track: Track, userId: string)
   → Promise<{ url: string; expiresAt?: string }>
2. Implementación `MuxProvider`:
   - valida configuración (signing keys)
   - genera JWT con header {alg: HS256, kid} y payload {sub, exp}
   - arma URL final `${MUX_PLAYBACK_BASE}/${playbackId}.m3u8?token=${jwt}`
3. Factory `ProviderFactory`:
   - selecciona proveedor por `process.env.VIDEO_PROVIDER`
4. Endpoint `/tracks/:id/playback-credentials`:
   - requiere autenticación
   - obtiene track por id
   - si `policy="public"` → devuelve URL pública (sin token)
   - si `policy="signed"` y falta `playbackId` → 409 MISSING_PLAYBACK_ID
   - si `policy="signed"` → usa MuxProvider para firmar y devuelve URL + expiresAt
   - respuesta uniforme:
     {
       provider: "mux",
       url: "...m3u8?token=...",
       expiresAt: ISO-8601 | null,
       hints: { policy: "signed" | "public", ttlSeconds?: number }
     }
5. Middleware global `errorHandler`:
   → { error:{ code, message }, requestId }
   Códigos: NOT_FOUND, FORBIDDEN, VALIDATION_ERROR,
            MISSING_PLAYBACK_ID, PROVIDER_CONFIG_ERROR, UPSTREAM_ERROR.
6. Seguridad mínima:
   - rate-limit al endpoint
   - CORS restringido
   - no loguear JWT completo
   - validar Signing Key base64 al iniciar

---

🧪 PRUEBAS A INCLUIR
UNIT:
- firma JWT (kid correcto, exp ≈ TTL)
- ramas public/signed
- error MISSING_PLAYBACK_ID
- configuración inválida (base64)
E2E:
- registro → promote-admin → login → POST /track → GET /track → POST /playback-credentials
- expiración (TTL corto) → token inválido → reintento → éxito

---

📄 VARIABLES .env
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
MUX_SIGNING_KEY_ID=
MUX_SIGNING_KEY_SECRET= # base64
MUX_SIGNED_TTL=120
MUX_PLAYBACK_BASE=https://stream.mux.com
VIDEO_PROVIDER=mux
E2E_MONGODB_URI=

---

🧩 RESTRICCIONES
- No refactorizar a Course/Module/Lesson/Enrollment aún.
- Mantener el contrato de credenciales estable y portable.
- No modificar endpoints GET/POST / tracks existentes.

---

🛠️ SALIDA ESPERADA
Codex debe generar:
1. src/providers/VideoProvider.ts
2. src/providers/MuxProvider.ts
3. src/providers/ProviderFactory.ts
4. src/routes/tracks.playbackCredentials.ts
5. src/middleware/errorHandler.ts
6. tests/unit y tests/e2e básicos (Jest/Vitest)
Todo en TypeScript estricto, con comentarios explicativos y sin redefinir el modelo Track.

---

🎯 PROPÓSITO
Consolidar la base técnica del playback seguro (MUX firmado + TTL + manejo de errores)
antes de migrar al dominio Course/Module/Lesson/VideoAsset en el Incremento 3.

---

✅ ESTADO
- Alcance completado en `Incremento 2 - Playback seguro (MUX)`.
- Endpoint `/tracks/:id/playback-credentials` y contrato documentado.
- Tests unitarios y E2E (condicionales) incluidos en el PR.
- Documentación, variables `.env.example` y colección HTTPie agregadas.
- Preparado para migrar a Lessons manteniendo el mismo contrato.

# 🧱 ADR-002 — Estructura de Tracks y transición a Lessons con reproducción segura

## 📅 Fecha

27 de octubre de 2025

## 🎯 Contexto

El proyecto comenzó usando el dominio **`Track`** como representación de piezas audiovisuales reproducibles.
Actualmente, el modelo de negocio requiere una jerarquía académica:

```
Course 1—N Module 1—N Lesson 1—0..1 VideoAsset
User 1—N Enrollment N—1 Course
```

Cada **Lesson** puede tener un **VideoAsset**, reproducido mediante un proveedor (MUX hoy, DRM más adelante).
Se necesita un endpoint de **reproducción segura** que sirva para ambos escenarios (temporal con “tracks” y definitivo con “lessons”), sin romper el frontend.

---

## ⚙️ Decisión

1. **Mantener `Track` como dominio temporal** hasta completar el Incremento 2 (MUX + error handler + E2E).
2. Implementar el endpoint:

   ```
   POST /tracks/:id/playback-credentials
   ```

   con un **contrato estable y agnóstico del proveedor**, que luego se reutilizará en:

   ```
   POST /lessons/:id/playback-credentials
   ```
3. Estandarizar la **respuesta**:

   ```json
   {
     "provider": "mux",
     "url": "https://stream.mux.com/PLAYBACK_ID.m3u8?token=JWT...",
     "expiresAt": "2025-10-27T15:05:12.000Z",
     "hints": { "policy": "signed", "ttlSeconds": 120 }
   }
   ```

   * `policy='public'` → `expiresAt=null`
   * `policy='signed'` → incluye `expiresAt` y `ttlSeconds`
4. Estandarizar errores:

   ```json
   { "error": { "code": "FORBIDDEN", "message": "..." }, "requestId": "..." }
   ```

   Códigos: `NOT_FOUND`, `MISSING_PLAYBACK_ID`, `NO_VIDEO_ASSET`,
   `VALIDATION_ERROR`, `PROVIDER_CONFIG_ERROR`, `UPSTREAM_ERROR`.
5. Configurar **TTL = 120 s** (ajustable con `MUX_SIGNED_TTL`).
6. Validar en arranque las **signing keys** de MUX (`base64`) y fallar si son inválidas.
7. Implementar **rate limiting** y **CORS restrictivo** en el endpoint.
8. Documentar que el **frontend recibirá siempre una URL lista para reproducir**, sin tener que construirla.

---

## 🔄 Consecuencias

* El contrato de **playback-credentials** será **independiente del proveedor** (MUX hoy, DRM mañana).
* La migración a **Lesson** no romperá el frontend (solo se cambiará la ruta).
* Se mantiene la velocidad de desarrollo y las pruebas E2E actuales.
* `Track` quedará **deprecated** en el Incremento 3, cuando se introduzcan `Course`, `Module`, `Lesson`, `VideoAsset`, y `Enrollment`.
* El endpoint se integrará con `isPreview` y `Enrollment` para autorizar acceso en el nuevo modelo.

---

## 🚧 Riesgos y mitigaciones

| Riesgo                                            | Mitigación                                              |
| ------------------------------------------------- | ------------------------------------------------------- |
| Expiración prematura del token                    | TTL ajustable y reintento automático del cliente        |
| Confusión entre Access Token y Signing Key de MUX | Validación en startup y documentación en `.env.example` |
| “Tracks” propagados en frontend                   | Usar “Cursos/Lecciones” en UI y docs desde ahora        |
| Ausencia de `playbackId` o asset no listo         | Responder 409 `MISSING_PLAYBACK_ID` o hint `processing` |
| Token leak en logs                                | Sanitizar logs y no guardar JWT completo                |

---

## 📈 Próximos pasos

**Incremento 3**

* Crear entidades: `Course`, `Module`, `Lesson`, `VideoAsset`, `Enrollment`.
* Migrar endpoint a `POST /lessons/:id/playback-credentials` (mismo contrato).
* Implementar verificación `isPreview` y `Enrollment` en autorización.
* Documentar alias temporal o plan de deprecación de `tracks`.

---

## ✅ Estado

**Aprobado.**
En uso para Incremento 2.
Se migrará en Incremento 3 al modelo académico completo.

---

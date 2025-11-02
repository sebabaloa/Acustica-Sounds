# Observabilidad — Playback seguro

## Namespace
`api.playback`

## Métricas expuestas

| Métrica | Tipo | Etiquetas | Descripción |
| ------- | ---- | --------- | ----------- |
| `api.playback.emissions_total` | counter | `policy` (`public`\|`signed`) | Total de credenciales emitidas por política |
| `api.playback.errors_total` | counter | `code` (`NOT_FOUND`, `PROVIDER_CONFIG_ERROR`, etc.) | Errores generados por el endpoint |
| `api.playback.request_duration_p95_ms` | gauge (snapshot) | — | Latencia P95 de las emisiones calculada en memoria |

## Uso operativo
- Vigilar picos en `errors_total` y correlacionar con `code` (`TOO_MANY_REQUESTS`, `PROVIDER_CONFIG_ERROR`, etc.).
- Caídas en `emissions_total` pueden indicar fallos de autenticación o bloqueo de CORS.
- Incrementos sostenidos en `request_duration_p95_ms` sugieren backpressure en Mongo o Mux.
- Relacionar `errors_total{code="TOO_MANY_REQUESTS"}` con `PLAYBACK_RATELIMIT_PER_MIN` para ajustar el límite.

## Próximos pasos sugeridos
- Exponer estas métricas vía Prometheus o un collector centralizado.
- Añadir histogramas para latencia y distribución de TTL solicitados.

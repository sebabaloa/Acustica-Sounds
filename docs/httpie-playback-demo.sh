#!/usr/bin/env bash

# Demo del flujo principal del Incremento 2 usando HTTPie.
# Requiere HTTPie instalado y la API corriendo en http://localhost:3001
# Antes de usar:
#   export API_URL=http://localhost:3001
#   export API_EMAIL=demo@example.com
#   export API_PASSWORD='Passw0rd!'
#   export API_ADMIN_EMAIL=admin@example.com
#   export API_TRACK_PLAYBACK_ID=<playback_id_de_mux>

set -euo pipefail

API_URL=${API_URL:-http://localhost:3001}
EMAIL=${API_EMAIL:?Define API_EMAIL}
PASSWORD=${API_PASSWORD:?Define API_PASSWORD}
ADMIN_EMAIL=${API_ADMIN_EMAIL:?Define API_ADMIN_EMAIL}
PLAYBACK_ID=${API_TRACK_PLAYBACK_ID:?Define API_TRACK_PLAYBACK_ID}

echo "➡️  Registrando usuario final: $EMAIL"
http POST "$API_URL/auth/register" email="$EMAIL" password="$PASSWORD" || true

echo "➡️  Registrando administrador: $ADMIN_EMAIL"
http POST "$API_URL/auth/register" email="$ADMIN_EMAIL" password="$PASSWORD" || true

echo "➡️  Promoviendo administrador (usa script si ya existe)"
pnpm --filter ./apps/api promote-admin "$ADMIN_EMAIL" "$PASSWORD"

echo "➡️  Login usuario final"
USER_LOGIN=$(http --print=b "$API_URL/auth/login" email="$EMAIL" password="$PASSWORD")
USER_TOKEN=$(echo "$USER_LOGIN" | jq -r '.accessToken')

echo "➡️  Login admin"
ADMIN_LOGIN=$(http --print=b "$API_URL/auth/login" email="$ADMIN_EMAIL" password="$PASSWORD")
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.accessToken')

echo "➡️  Creando track firmado"
TRACK_CREATE=$(http --print=b POST "$API_URL/tracks" \
  Authorization:"Bearer $ADMIN_TOKEN" \
  title="Demo Track" \
  artist="Incremento 2" \
  policy='signed' \
  playbackId="$PLAYBACK_ID" \
  signedTtlSeconds:=120)
TRACK_ID=$(echo "$TRACK_CREATE" | jq -r '.track.id')

echo "➡️  Listando tracks"
http GET "$API_URL/tracks" Authorization:"Bearer $USER_TOKEN"

echo "➡️  Solicitando credenciales de reproducción"
http POST "$API_URL/tracks/$TRACK_ID/playback-credentials" Authorization:"Bearer $USER_TOKEN"

echo "✅  Listo. Usa la URL devuelta (campo url) para reproducir el asset en tu player Mux."

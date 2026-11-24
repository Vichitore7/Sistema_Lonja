#!/bin/bash
# CREATE (insert): agrega un tipo nuevo
# Uso: ./crear.sh "Moluscos"
source "$(dirname "$0")/comun.sh"
[ -z "$1" ] && { echo "Uso: $0 \"<nombre>\""; exit 1; }

echo "POST $API/tipos"
curl -s -w "\nHTTP %{http_code}\n" -X POST "$API/tipos" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"nombre\":\"$1\"}"

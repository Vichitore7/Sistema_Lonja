#!/bin/bash
# UPDATE (modificación): cambia el nombre de un tipo
# Uso: ./modificar.sh 4 "Moluscos bivalvos"
source "$(dirname "$0")/comun.sh"
[ -z "$2" ] && { echo "Uso: $0 <id> \"<nuevo nombre>\""; exit 1; }

echo "PUT $API/tipos/$1"
curl -s -w "\nHTTP %{http_code}\n" -X PUT "$API/tipos/$1" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"nombre\":\"$2\"}"

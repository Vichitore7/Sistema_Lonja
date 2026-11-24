#!/bin/bash
# READ: lista todos los tipos
# Uso: ./listar.sh
source "$(dirname "$0")/comun.sh"

echo "GET $API/tipos?todos=1"
curl -s -X GET "$API/tipos?todos=1" -H "Authorization: Bearer $TOKEN" | bonito

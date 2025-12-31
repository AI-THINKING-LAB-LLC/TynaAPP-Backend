#!/bin/bash

# Script pour démarrer Laravel avec détection automatique de PHP

cd "$(dirname "$0")/TynaAPP-Backend"

# Essayer différents chemins PHP
PHP_PATHS=(
    "/opt/homebrew/bin/php"
    "/usr/local/bin/php"
    "/usr/bin/php"
    "php"
)

PHP_CMD=""

for path in "${PHP_PATHS[@]}"; do
    if command -v "$path" &> /dev/null; then
        if "$path" --version &> /dev/null; then
            PHP_CMD="$path"
            break
        fi
    fi
done

if [ -z "$PHP_CMD" ]; then
    echo "❌ PHP non trouvé. Veuillez installer PHP 8.2+"
    echo ""
    echo "Sur macOS avec Homebrew:"
    echo "  brew install php"
    exit 1
fi

echo "✅ PHP trouvé: $PHP_CMD"
echo "🚀 Démarrage de Laravel sur http://localhost:8000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

"$PHP_CMD" artisan serve --host=127.0.0.1


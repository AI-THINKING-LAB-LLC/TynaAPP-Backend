#!/bin/bash

# Script pour vider le cache Laravel et Filament

cd "$(dirname "$0")"

echo "🧹 Nettoyage du cache Laravel..."

# Vider tous les caches
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan view:clear

# Optimiser (optionnel)
# php artisan config:cache
# php artisan route:cache

echo "✅ Cache vidé !"
echo ""
echo "🚀 Redémarrez Laravel maintenant :"
echo "   php artisan serve"


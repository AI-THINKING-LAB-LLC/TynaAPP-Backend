#!/bin/sh
set -e

echo "🚀 Starting Railway Complete Setup (Frontend + Backend)"

# Variables d'environnement
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}

# Démarrer PHP-FPM pour Laravel
echo "📦 Starting PHP-FPM..."
php-fpm82 -D

# Démarrer le backend Laravel
echo "🔧 Starting Laravel backend on port $BACKEND_PORT..."
cd /var/www/backend

# Générer APP_KEY si manquant
if [ -z "$APP_KEY" ]; then
    echo "⚠️  APP_KEY not set, generating..."
    php artisan key:generate --force
fi

# Migrations
echo "📊 Running migrations..."
php artisan migrate --force || true

# Optimiser
echo "⚡ Optimizing Laravel..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Démarrer Laravel en arrière-plan
php artisan serve --host=127.0.0.1 --port=$BACKEND_PORT &

# Attendre que Laravel démarre
sleep 2

# Démarrer nginx
echo "🌐 Starting Nginx on port $PORT..."
exec nginx -g 'daemon off;'


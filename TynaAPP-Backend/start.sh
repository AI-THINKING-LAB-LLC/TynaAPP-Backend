#!/bin/bash
set -e

echo "🚀 Starting Laravel application..."

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    echo "⚠️  APP_KEY not set, generating..."
    php artisan key:generate --force
fi

# Run migrations
echo "📦 Running migrations..."
php artisan migrate --force || true

# Clear and cache config
echo "🔧 Optimizing application..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Start server
echo "✅ Starting server on 0.0.0.0:$PORT"
exec php artisan serve --host=0.0.0.0 --port=$PORT


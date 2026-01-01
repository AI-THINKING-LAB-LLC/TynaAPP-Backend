#!/bin/bash
set -e

echo "🚀 Starting Laravel application..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    # Try to copy from .env.example if it exists
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Copied .env.example to .env"
    else
        # Create minimal .env file with required variables
        cat > .env <<EOF
APP_NAME=Tyna
APP_ENV=production
APP_DEBUG=false
APP_URL=\${APP_URL:-http://localhost}
APP_KEY=
DB_CONNECTION=sqlite
DB_DATABASE=/tmp/database.sqlite
EOF
        echo "✅ Created minimal .env file"
    fi
fi

# Generate app key if not set (only if APP_KEY is empty in .env or env var)
if ! grep -q "APP_KEY=base64:" .env 2>/dev/null && [ -z "$APP_KEY" ]; then
    echo "⚠️  APP_KEY not set, generating..."
    php artisan key:generate --force || echo "⚠️  Could not generate key, using environment variable if set"
fi

# Run migrations
echo "📦 Running migrations..."
php artisan migrate --force || true

# Create admin user if it doesn't exist
echo "👤 Creating admin user..."
php artisan app:create-admin-user --email=admin@admin.com --password=password --name=Admin || true

# Clear cache first to ensure fresh config
echo "🧹 Clearing cache..."
php artisan config:clear || true
php artisan cache:clear || true
php artisan route:clear || true

# Cache config for production (after clearing)
echo "🔧 Optimizing application..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Start server
echo "✅ Starting server on 0.0.0.0:$PORT"
exec php artisan serve --host=0.0.0.0 --port=$PORT


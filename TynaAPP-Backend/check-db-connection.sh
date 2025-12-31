#!/bin/bash
echo "🔍 Testing PostgreSQL connection..."

cd "$(dirname "$0")"

# Read DB config from .env
DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" .env | cut -d '=' -f2)
DB_USERNAME=$(grep "^DB_USERNAME=" .env | cut -d '=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2)

echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_DATABASE"
echo "Username: $DB_USERNAME"
echo ""

# Test DNS
echo "Testing DNS resolution..."
if nslookup "$DB_HOST" > /dev/null 2>&1; then
    echo "✅ DNS resolution OK"
else
    echo "❌ DNS resolution FAILED"
    echo "   Please check the hostname in Supabase Dashboard"
fi

# Test connection
echo ""
echo "Testing PostgreSQL connection..."
/Applications/XAMPP/xamppfiles/bin/php artisan migrate:status 2>&1 | head -5

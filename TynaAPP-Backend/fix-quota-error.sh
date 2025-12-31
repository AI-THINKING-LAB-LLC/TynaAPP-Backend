#!/bin/bash

echo "🔧 Fixing quota column error..."

cd "$(dirname "$0")"

# Find PHP
PHP_CMD=""
if command -v php &> /dev/null; then
    PHP_CMD="php"
elif [ -f "/Applications/XAMPP/xamppfiles/bin/php" ]; then
    PHP_CMD="/Applications/XAMPP/xamppfiles/bin/php"
    export PATH="/Applications/XAMPP/xamppfiles/bin:$PATH"
elif [ -d "/Applications/MAMP/bin/php" ]; then
    PHP_PATH=$(find /Applications/MAMP/bin/php -name "php8.*" -type d | head -1)/bin
    if [ -f "$PHP_PATH/php" ]; then
        PHP_CMD="$PHP_PATH/php"
        export PATH="$PHP_PATH:$PATH"
    fi
fi

if [ -z "$PHP_CMD" ]; then
    echo "❌ PHP not found. Please run manually:"
    echo "   cd $(pwd)"
    echo "   php artisan config:clear"
    echo "   php artisan cache:clear"
    exit 1
fi

echo "✅ Using PHP: $PHP_CMD"
$PHP_CMD --version

# Verify columns exist in database
echo ""
echo "🔍 Verifying database columns..."
sqlite3 database/database.sqlite "PRAGMA table_info(plans);" | grep -E "(quota|minutes)" || echo "⚠️  Columns not found in database"

# Clear Laravel caches
echo ""
echo "🧹 Clearing Laravel caches..."
$PHP_CMD artisan config:clear
$PHP_CMD artisan cache:clear
$PHP_CMD artisan route:clear
$PHP_CMD artisan view:clear

echo ""
echo "✅ Cache cleared!"
echo ""
echo "🚀 Please restart your Laravel server:"
echo "   $PHP_CMD artisan serve"
echo ""
echo "Or if using a different method, restart your server process."


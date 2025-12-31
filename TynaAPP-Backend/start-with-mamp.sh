#!/bin/bash
echo "🚀 Starting Tyna Backend with MAMP PHP..."

# Trouver PHP 8.2 dans MAMP
PHP_PATH=$(find /Applications/MAMP/bin/php -name "php8.2*" -type d | head -1)/bin

if [ -z "$PHP_PATH" ] || [ ! -f "$PHP_PATH/php" ]; then
    echo "❌ PHP 8.2 not found in MAMP"
    echo "Available versions:"
    ls /Applications/MAMP/bin/php/
    exit 1
fi

echo "✅ Using PHP: $PHP_PATH/php"
$PHP_PATH/php --version

export PATH="$PHP_PATH:$PATH"

cd "$(dirname "$0")"

# Installer Composer si nécessaire
if ! command -v composer &> /dev/null; then
    echo "📦 Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    echo "✅ Composer installed"
fi

# Créer .env si nécessaire
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    php artisan key:generate
    echo "✅ .env created"
    echo ""
    echo "⚠️  IMPORTANT: Configure database in .env:"
    echo "   DB_HOST=127.0.0.1"
    echo "   DB_PORT=8889  # MAMP default port"
    echo "   DB_DATABASE=tyna_backend"
    echo "   DB_USERNAME=root"
    echo "   DB_PASSWORD=root"
    echo ""
fi

# Installer dépendances
if [ ! -d vendor ]; then
    echo "📦 Installing dependencies (this may take a few minutes)..."
    composer install --no-interaction
    echo "✅ Dependencies installed"
fi

# Lancer serveur
echo ""
echo "✅ Starting Laravel server..."
echo "📡 API: http://localhost:8000/api"
echo "🎛️  Admin: http://localhost:8000/tynaadm"
echo ""
php artisan serve

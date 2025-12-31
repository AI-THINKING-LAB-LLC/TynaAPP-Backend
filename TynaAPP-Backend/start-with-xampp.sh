#!/bin/bash
echo "🚀 Starting Tyna Backend with XAMPP PHP..."

PHP_PATH="/Applications/XAMPP/xamppfiles/bin"

if [ ! -f "$PHP_PATH/php" ]; then
    echo "❌ XAMPP PHP not found at $PHP_PATH"
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

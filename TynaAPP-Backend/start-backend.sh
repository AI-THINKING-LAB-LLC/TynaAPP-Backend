#!/bin/bash
echo "🚀 Starting Tyna Backend..."

# Check PHP
if ! command -v php &> /dev/null; then
    echo "❌ PHP not found. Installing PHP 8.2 via Homebrew..."
    brew install php@8.2
    echo 'export PATH="/opt/homebrew/opt/php@8.2/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/opt/php@8.2/bin:$PATH"
fi

# Check Composer
if ! command -v composer &> /dev/null; then
    echo "❌ Composer not found. Installing Composer..."
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
fi

cd "$(dirname "$0")"

# Check .env
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    php artisan key:generate
fi

# Install dependencies
if [ ! -d vendor ]; then
    echo "📦 Installing dependencies..."
    composer install
fi

# Run migrations
echo "🗄️  Running migrations..."
php artisan migrate --force

# Start server
echo "✅ Starting Laravel server on http://localhost:8000"
echo "📡 API: http://localhost:8000/api"
echo "🎛️  Admin: http://localhost:8000/tynaadm"
php artisan serve

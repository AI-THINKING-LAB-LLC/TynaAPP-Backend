<?php

/**
 * Script pour créer les prix Stripe via l'API
 * 
 * Usage: php create-stripe-prices.php
 * 
 * Ce script crée les prix récurrents dans Stripe pour le produit prod_The9T6xexlrGOj
 */

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

// Charger les variables d'environnement
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$stripeSecret = $_ENV['STRIPE_SECRET'] ?? null;

if (!$stripeSecret) {
    echo "❌ STRIPE_SECRET n'est pas configuré dans .env\n";
    exit(1);
}

\Stripe\Stripe::setApiKey($stripeSecret);

$productId = 'prod_The9T6xexlrGOj';

echo "🔍 Vérification du produit: {$productId}\n";

try {
    // Vérifier que le produit existe
    $product = \Stripe\Product::retrieve($productId);
    echo "✅ Produit trouvé: {$product->name}\n\n";
} catch (\Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}

// Prix à créer
$prices = [
    [
        'name' => 'Starter',
        'amount' => 0,
        'trial_days' => 0,
    ],
    [
        'name' => 'Plus',
        'amount' => 1500, // $15.00
        'trial_days' => 7,
    ],
    [
        'name' => 'Pro',
        'amount' => 3000, // $30.00
        'trial_days' => 7,
    ],
];

$createdPrices = [];

foreach ($prices as $priceData) {
    echo "📦 Création du prix pour: {$priceData['name']}\n";
    
    try {
        $price = \Stripe\Price::create([
            'product' => $productId,
            'unit_amount' => $priceData['amount'],
            'currency' => 'usd',
            'recurring' => [
                'interval' => 'month',
            ],
        ]);
        
        $createdPrices[$priceData['name']] = [
            'price_id' => $price->id,
            'amount' => $priceData['amount'],
            'trial_days' => $priceData['trial_days'],
        ];
        
        echo "✅ Prix créé: {$price->id}\n";
        echo "   Montant: $" . number_format($priceData['amount'] / 100, 2) . "/mois\n\n";
    } catch (\Exception $e) {
        echo "❌ Erreur lors de la création: " . $e->getMessage() . "\n\n";
    }
}

echo "\n📋 Résumé des prix créés:\n";
echo "========================\n\n";

foreach ($createdPrices as $name => $data) {
    echo "Plan: {$name}\n";
    echo "  Price ID: {$data['price_id']}\n";
    echo "  Montant: $" . number_format($data['amount'] / 100, 2) . "/mois\n";
    echo "  Trial: {$data['trial_days']} jours\n\n";
}

echo "\n✅ Prochaines étapes:\n";
echo "1. Copiez les Price IDs ci-dessus\n";
echo "2. Mettez à jour les plans dans Filament Admin (http://localhost:8000/tynaadm)\n";
echo "   ou exécutez: php artisan db:seed --class=PlanSeeder\n";
echo "   (après avoir remplacé les placeholders dans PlanSeeder.php)\n";


<?php

/**
 * Script pour vérifier et créer le Price ID pour le plan Plus
 * 
 * Usage: php fix-plus-plan-price.php
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

echo "🔍 Vérification du produit: {$productId}\n\n";

try {
    // Vérifier que le produit existe
    $product = \Stripe\Product::retrieve($productId);
    echo "✅ Produit trouvé: {$product->name}\n\n";
    
    // Lister tous les prix existants pour ce produit
    echo "📋 Prix existants pour ce produit:\n";
    echo "=====================================\n\n";
    
    $prices = \Stripe\Price::all([
        'product' => $productId,
        'active' => true,
    ]);
    
    $plusPriceFound = false;
    foreach ($prices->data as $price) {
        $amount = $price->unit_amount / 100;
        $interval = $price->recurring->interval ?? 'one-time';
        
        echo "Price ID: {$price->id}\n";
        echo "  Montant: \${$amount}/{$interval}\n";
        echo "  Actif: " . ($price->active ? 'Oui' : 'Non') . "\n";
        
        // Vérifier si c'est un prix pour $15/mois
        if ($amount == 15 && $interval == 'month') {
            echo "  ✅ C'est le prix pour le plan Plus!\n";
            $plusPriceFound = true;
            
            // Mettre à jour la base de données
            echo "\n🔄 Mise à jour de la base de données...\n";
            $app = require_once __DIR__ . '/bootstrap/app.php';
            $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
            
            $plan = \App\Models\Plan::where('name', 'Plus')->where('interval', 'month')->first();
            if ($plan) {
                $plan->stripe_price_id = $price->id;
                $plan->save();
                echo "✅ Plan Plus mis à jour avec le Price ID: {$price->id}\n";
            } else {
                echo "⚠️  Plan Plus non trouvé dans la base de données\n";
            }
        }
        echo "\n";
    }
    
    // Si aucun prix $15/mois n'est trouvé, en créer un
    if (!$plusPriceFound) {
        echo "❌ Aucun prix \$15/mois trouvé pour ce produit.\n";
        echo "\n🔧 Création d'un nouveau prix...\n";
        
        $price = \Stripe\Price::create([
            'product' => $productId,
            'unit_amount' => 1500, // $15.00 en cents
            'currency' => 'usd',
            'recurring' => [
                'interval' => 'month',
            ],
        ]);
        
        echo "✅ Nouveau prix créé: {$price->id}\n";
        echo "   Montant: \$15.00/mois\n\n";
        
        // Mettre à jour la base de données
        echo "🔄 Mise à jour de la base de données...\n";
        $app = require_once __DIR__ . '/bootstrap/app.php';
        $app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
        
        $plan = \App\Models\Plan::where('name', 'Plus')->where('interval', 'month')->first();
        if ($plan) {
            $plan->stripe_price_id = $price->id;
            $plan->save();
            echo "✅ Plan Plus mis à jour avec le nouveau Price ID: {$price->id}\n";
        } else {
            echo "⚠️  Plan Plus non trouvé dans la base de données\n";
        }
    }
    
} catch (\Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Terminé!\n";


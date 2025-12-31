<?php

namespace App\Console\Commands;

use App\Models\Plan;
use Illuminate\Console\Command;
use Stripe\Stripe;
use Stripe\Price;
use Stripe\Exception\ApiErrorException;

class SetupAllPlans extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'plan:setup-all {--create-prices}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Configure tous les plans (Starter, Plus, Pro) avec des Price IDs Stripe valides';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $createPrices = $this->option('create-prices');
        $productId = 'prod_The9T6xexlrGOj';

        $stripeSecret = config('services.stripe.secret') ?? env('STRIPE_SECRET') ?? getenv('STRIPE_SECRET');

        if ($createPrices && !$stripeSecret) {
            $this->error('❌ STRIPE_SECRET n\'est pas configuré dans .env');
            return 1;
        }

        if ($createPrices) {
            Stripe::setApiKey($stripeSecret);
            
            try {
                $product = \Stripe\Product::retrieve($productId);
                $this->info("✅ Produit trouvé: {$product->name}\n");
            } catch (ApiErrorException $e) {
                $this->error("❌ Erreur Stripe: " . $e->getMessage());
                return 1;
            }
        }

        $plans = [
            [
                'name' => 'Starter',
                'amount' => 0,
                'trial_days' => 0,
                'allow_promotion_codes' => false,
                'description' => 'Perfect for trying Tyna and basic meeting needs.',
            ],
            [
                'name' => 'Plus',
                'amount' => 1500,
                'trial_days' => 7,
                'allow_promotion_codes' => true,
                'description' => 'For professionals who have frequent meetings.',
            ],
            [
                'name' => 'Pro',
                'amount' => 3000,
                'trial_days' => 7,
                'allow_promotion_codes' => true,
                'description' => 'Complete invisibility and enterprise features.',
            ],
        ];

        $this->info("📦 Configuration des plans...\n");

        foreach ($plans as $planData) {
            $this->info("🔧 Plan: {$planData['name']}");
            
            $priceId = null;

            // Si --create-prices est spécifié, créer le prix dans Stripe
            if ($createPrices) {
                try {
                    $price = Price::create([
                        'product' => $productId,
                        'unit_amount' => $planData['amount'],
                        'currency' => 'usd',
                        'recurring' => [
                            'interval' => 'month',
                        ],
                    ]);
                    
                    $priceId = $price->id;
                    $this->info("   ✅ Prix créé dans Stripe: {$priceId}");
                } catch (ApiErrorException $e) {
                    $this->warn("   ⚠️  Erreur lors de la création du prix: " . $e->getMessage());
                    $this->warn("   ⚠️  Vous devrez créer le prix manuellement dans Stripe Dashboard");
                }
            } else {
                // Demander le Price ID à l'utilisateur
                $this->warn("   ⚠️  Pour le plan '{$planData['name']}', vous devez:");
                $this->info("   1. Créer le prix dans Stripe Dashboard");
                $this->info("   2. Copier le Price ID");
                $this->info("   3. Mettre à jour le plan dans Filament Admin");
                $this->info("   Ou utilisez --create-prices pour créer automatiquement\n");
                continue;
            }

            if ($priceId) {
                // Créer ou mettre à jour le plan
                $plan = Plan::updateOrCreate(
                    [
                        'name' => $planData['name'],
                        'interval' => 'month',
                    ],
                    [
                        'stripe_product_id' => $productId,
                        'stripe_price_id' => $priceId,
                        'amount' => $planData['amount'],
                        'currency' => 'usd',
                        'trial_days' => $planData['trial_days'],
                        'allow_promotion_codes' => $planData['allow_promotion_codes'],
                        'description' => $planData['description'],
                        'active' => true,
                    ]
                );

                $this->info("   ✅ Plan configuré: ID {$plan->id}, Price ID: {$priceId}\n");
            }
        }

        $this->info("✅ Configuration terminée!");
        $this->info("\n📋 Plans configurés:");
        
        $allPlans = Plan::where('active', true)->orderBy('amount')->get();
        foreach ($allPlans as $plan) {
            $status = str_starts_with($plan->stripe_price_id, 'price_') && 
                     !str_contains($plan->stripe_price_id, 'starter_monthly') &&
                     !str_contains($plan->stripe_price_id, 'pro_monthly')
                ? '✅' : '⚠️';
            
            $this->info("   {$status} {$plan->name}: {$plan->stripe_price_id}");
        }

        return 0;
    }
}


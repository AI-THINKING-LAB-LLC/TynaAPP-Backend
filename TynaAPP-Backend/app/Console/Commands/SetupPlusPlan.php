<?php

namespace App\Console\Commands;

use App\Models\Plan;
use Illuminate\Console\Command;
use Stripe\Stripe;
use Stripe\Price;
use Stripe\Exception\ApiErrorException;

class SetupPlusPlan extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'plan:setup-plus {--price-id=} {--create-price}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Configure le plan Plus ($15/mois) avec un Price ID Stripe valide';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $priceId = $this->option('price-id');
        $createPrice = $this->option('create-price');

        $productId = 'prod_The9T6xexlrGOj';

        // Si --create-price est spécifié, créer le prix dans Stripe
        if ($createPrice) {
            $this->info('🔧 Création du prix dans Stripe...');
            
            $stripeSecret = config('services.stripe.secret') ?? env('STRIPE_SECRET');
            
            if (!$stripeSecret) {
                $this->error('❌ STRIPE_SECRET n\'est pas configuré dans .env');
                return 1;
            }

            Stripe::setApiKey($stripeSecret);

            try {
                // Vérifier que le produit existe
                $product = \Stripe\Product::retrieve($productId);
                $this->info("✅ Produit trouvé: {$product->name}");

                // Créer le prix récurrent
                $price = Price::create([
                    'product' => $productId,
                    'unit_amount' => 1500, // $15.00 en cents
                    'currency' => 'usd',
                    'recurring' => [
                        'interval' => 'month',
                    ],
                ]);

                $priceId = $price->id;
                $this->info("✅ Prix créé: {$priceId}");
            } catch (ApiErrorException $e) {
                $this->error("❌ Erreur Stripe: " . $e->getMessage());
                return 1;
            }
        }

        // Si aucun price_id n'est fourni, demander à l'utilisateur
        if (!$priceId) {
            $this->warn('⚠️  Aucun Price ID fourni.');
            $this->info('Options:');
            $this->info('1. Utiliser --create-price pour créer automatiquement le prix dans Stripe');
            $this->info('2. Utiliser --price-id=price_XXXXX pour utiliser un prix existant');
            $this->info('');
            $this->info('Pour créer le prix manuellement dans Stripe Dashboard:');
            $this->info('1. Allez sur https://dashboard.stripe.com');
            $this->info("2. Products → {$productId} → Add another price");
            $this->info('3. Type: Recurring, Billing: Monthly, Price: $15.00');
            $this->info('4. Copiez le Price ID (commence par price_)');
            $this->info('5. Exécutez: php artisan plan:setup-plus --price-id=price_XXXXX');
            return 1;
        }

        // Vérifier que le price_id est valide
        if (!str_starts_with($priceId, 'price_')) {
            $this->error("❌ Format invalide. Les Price IDs doivent commencer par 'price_'");
            return 1;
        }

        // Vérifier que le prix existe dans Stripe (optionnel mais recommandé)
        $stripeSecret = config('services.stripe.secret') ?? env('STRIPE_SECRET') ?? getenv('STRIPE_SECRET');
        if ($stripeSecret) {
            Stripe::setApiKey($stripeSecret);
            try {
                $price = Price::retrieve($priceId);
                $this->info("✅ Prix vérifié dans Stripe: {$price->nickname ?? 'Sans nom'} - $" . number_format($price->unit_amount / 100, 2) . "/{$price->recurring->interval}");
            } catch (ApiErrorException $e) {
                $this->warn("⚠️  Impossible de vérifier le prix dans Stripe: " . $e->getMessage());
                $this->warn("   Le prix sera quand même configuré dans la base de données.");
            }
        }

        // Créer ou mettre à jour le plan
        $plan = Plan::updateOrCreate(
            [
                'name' => 'Plus',
                'interval' => 'month',
            ],
            [
                'stripe_product_id' => $productId,
                'stripe_price_id' => $priceId,
                'amount' => 1500, // $15.00 en cents
                'currency' => 'usd',
                'trial_days' => 7,
                'quota' => 100, // Quota mensuel par défaut (ex: 100 meetings)
                'minutes' => 1000, // Minutes mensuelles par défaut (ex: 1000 minutes)
                'allow_promotion_codes' => true,
                'description' => 'For professionals who have frequent meetings.',
                'active' => true,
            ]
        );

        $this->info("✅ Plan 'Plus' configuré avec succès!");
        $this->info("   ID: {$plan->id}");
        $this->info("   Price ID: {$plan->stripe_price_id}");
        $this->info("   Montant: $" . number_format($plan->amount / 100, 2) . "/mois");
        $this->info("   Trial: {$plan->trial_days} jours");
        $this->info("   Quota: " . ($plan->quota ?? 'Illimité') . " par mois");
        $this->info("   Minutes: " . ($plan->minutes ?? 'Illimité') . " par mois");

        return 0;
    }
}


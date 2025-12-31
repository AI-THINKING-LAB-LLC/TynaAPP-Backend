<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * IMPORTANT: Avant d'exécuter ce seeder, vous devez créer les prix dans Stripe Dashboard
     * et remplacer les placeholders 'price_XXXXX' par les vrais Price IDs.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Starter',
                'stripe_product_id' => 'prod_The9T6xexlrGOj',
                'stripe_price_id' => 'price_XXXXX_STARTER', // ⚠️ REMPLACER par le vrai Price ID depuis Stripe
                'interval' => 'month',
                'amount' => 0, // Gratuit
                'currency' => 'usd',
                'trial_days' => 0,
                'allow_promotion_codes' => false,
                'description' => 'Perfect for trying Tyna and basic meeting needs.',
                'active' => true,
            ],
            [
                'name' => 'Plus',
                'stripe_product_id' => 'prod_The9T6xexlrGOj',
                'stripe_price_id' => 'price_XXXXX_PLUS', // ⚠️ REMPLACER par le vrai Price ID depuis Stripe
                'interval' => 'month',
                'amount' => 1500, // $15.00 en cents
                'currency' => 'usd',
                'trial_days' => 7,
                'allow_promotion_codes' => true,
                'description' => 'For professionals who have frequent meetings.',
                'active' => true,
            ],
            [
                'name' => 'Pro',
                'stripe_product_id' => 'prod_The9T6xexlrGOj',
                'stripe_price_id' => 'price_XXXXX_PRO', // ⚠️ REMPLACER par le vrai Price ID depuis Stripe
                'interval' => 'month',
                'amount' => 3000, // $30.00 en cents
                'currency' => 'usd',
                'trial_days' => 7,
                'allow_promotion_codes' => true,
                'description' => 'Complete invisibility and enterprise features.',
                'active' => true,
            ],
        ];

        foreach ($plans as $planData) {
            Plan::updateOrCreate(
                [
                    'name' => $planData['name'],
                    'interval' => $planData['interval']
                ],
                $planData
            );
        }
    }
}


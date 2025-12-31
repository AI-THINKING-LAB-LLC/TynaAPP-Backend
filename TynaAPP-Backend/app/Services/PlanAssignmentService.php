<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PlanAssignmentService
{
    /**
     * Attribue automatiquement le plan Starter (gratuit) à un utilisateur
     * 
     * @param User $user L'utilisateur à qui attribuer le plan
     * @return bool True si le plan a été attribué avec succès, false sinon
     */
    public static function assignStarterPlan(User $user): bool
    {
        try {
            $starterPlan = Plan::where('name', 'Starter')
                ->where('interval', 'month')
                ->where('active', true)
                ->first();

            if (!$starterPlan) {
                Log::warning('Starter plan not found in database', [
                    'user_id' => $user->id,
                ]);
                return false;
            }

            // Vérifier qu'il n'y a pas déjà une subscription active pour cet utilisateur
            $existingSubscription = DB::table('subscriptions')
                ->where('user_id', $user->id)
                ->where('type', 'default')
                ->where('stripe_status', 'active')
                ->where(function ($query) {
                    $query->whereNull('ends_at')
                        ->orWhere('ends_at', '>', now());
                })
                ->first();

            if ($existingSubscription) {
                Log::info('User already has an active subscription, skipping Starter plan assignment', [
                    'user_id' => $user->id,
                    'subscription_id' => $existingSubscription->id,
                ]);
                return false;
            }

            // Créer une subscription locale pour le plan Starter (gratuit, sans Stripe)
            DB::table('subscriptions')->insert([
                'user_id' => $user->id,
                'type' => 'default',
                'stripe_id' => 'local_starter_' . $user->id . '_' . time(),
                'stripe_status' => 'active',
                'stripe_price' => $starterPlan->stripe_price_id ?? 'free',
                'quantity' => 1,
                'trial_ends_at' => null,
                'ends_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('Starter plan automatically assigned to user', [
                'user_id' => $user->id,
                'plan_id' => $starterPlan->id,
                'plan_name' => $starterPlan->name,
            ]);

            return true;
        } catch (\Exception $e) {
            // Log l'erreur mais ne bloque pas la création de l'utilisateur
            Log::warning('Failed to assign Starter plan to user', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return false;
        }
    }
}


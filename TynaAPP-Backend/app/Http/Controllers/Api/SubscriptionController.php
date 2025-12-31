<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Notifications\SubscriptionNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Exceptions\IncompletePayment;

class SubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'plan_id' => ['nullable', 'integer', 'exists:plans,id'],
                'price_id' => ['nullable', 'string'],
                'success_url' => ['required', 'url'],
                'cancel_url' => ['required', 'url'],
                'trial_days' => ['nullable', 'integer', 'min:1', 'max:365'],
                'allow_promotion_codes' => ['sometimes', 'boolean'],
            ]);

            /** @var \App\Models\User $user */
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'error' => 'unauthorized',
                    'message' => 'User not authenticated.',
                ], 401);
            }

            $user->createOrGetStripeCustomer();

            $plan = null;
            if (! empty($data['plan_id'])) {
                $plan = Plan::whereKey($data['plan_id'])->first();
                
                if (!$plan) {
                    return response()->json([
                        'error' => 'plan_not_found',
                        'message' => "Plan with ID {$data['plan_id']} not found.",
                    ], 404);
                }
            }

            $priceId = $plan?->stripe_price_id ?? $data['price_id'] ?? null;
            if (empty($priceId)) {
                $planName = $plan ? "Plan '{$plan->name}'" : 'The selected plan';
                return response()->json([
                    'error' => 'missing_price_id',
                    'message' => "{$planName} does not have a Stripe Price ID configured. Please configure the 'stripe_price_id' field in the plan settings.",
                ], 422);
            }
            
            // Validate that price_id looks like a valid Stripe price ID
            if (!str_starts_with($priceId, 'price_')) {
                return response()->json([
                    'error' => 'invalid_price_id_format',
                    'message' => "Invalid Price ID format. Stripe Price IDs must start with 'price_'. Current value: '{$priceId}'. Please check your plan configuration in Filament Admin.",
                ], 422);
            }

            $builder = $user
                ->newSubscription('default', $priceId);

            $trialDays = $data['trial_days'] ?? $plan?->trial_days;
            if (! empty($trialDays)) {
                $builder->trialDays($trialDays);
            }

            $allowPromo = $request->boolean('allow_promotion_codes', $plan?->allow_promotion_codes ?? false);
            if ($allowPromo) {
                $builder->allowPromotionCodes();
            }

            $checkout = $builder->checkout([
                'success_url' => $data['success_url'],
                'cancel_url' => $data['cancel_url'],
            ]);

            // Optionally notify or log price_id as plan identifier
            $user->notify(new SubscriptionNotification($priceId));

            return response()->json([
                'url' => $checkout->url,
                'checkout_url' => $checkout->url, // Alias for frontend compatibility
                'session_id' => $checkout->id,
            ], 201);
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            Log::error('Stripe API error', [
                'message' => $e->getMessage(),
                'code' => $e->getStripeCode(),
            ]);
            
            return response()->json([
                'error' => 'stripe_error',
                'message' => 'Stripe error: ' . $e->getMessage(),
            ], 400);
        } catch (\Exception $e) {
            Log::error('Subscription creation error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'error' => 'server_error',
                'message' => 'An error occurred while creating the subscription: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current user subscription
     */
    public function show(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        
        $subscription = $user->subscription('default');
        
        if (!$subscription) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'No active subscription',
            ]);
        }
        
        // Get plan information if available
        $plan = null;
        if ($subscription->stripe_price) {
            // Try to find plan by stripe_price_id
            $plan = Plan::where('stripe_price_id', $subscription->stripe_price)->first();
        }
        
        try {
            $stripeSubscription = $subscription->asStripeSubscription();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'stripe_status' => $subscription->stripe_status,
                    'stripe_price' => $subscription->stripe_price,
                    'stripe_product' => $subscription->stripe_product,
                    'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                    'current_period_start' => $stripeSubscription->current_period_start 
                        ? date('c', $stripeSubscription->current_period_start) 
                        : null,
                    'current_period_end' => $stripeSubscription->current_period_end 
                        ? date('c', $stripeSubscription->current_period_end) 
                        : null,
                    'cancel_at_period_end' => $subscription->cancel_at_period_end,
                    'plan' => $plan ? [
                        'id' => $plan->id,
                        'name' => $plan->name,
                        'amount' => $plan->amount,
                        'amount_formatted' => $plan->amount ? '$' . number_format($plan->amount / 100, 2) : 'Free',
                        'interval' => $plan->interval,
                        'description' => $plan->description,
                    ] : null,
                ],
            ]);
        } catch (\Exception $e) {
            // Fallback if Stripe subscription cannot be retrieved
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $subscription->id,
                    'status' => $subscription->status,
                    'stripe_status' => $subscription->stripe_status,
                    'stripe_price' => $subscription->stripe_price,
                    'stripe_product' => $subscription->stripe_product,
                    'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                    'cancel_at_period_end' => $subscription->cancel_at_period_end,
                    'plan' => $plan ? [
                        'id' => $plan->id,
                        'name' => $plan->name,
                        'amount' => $plan->amount,
                        'amount_formatted' => $plan->amount ? '$' . number_format($plan->amount / 100, 2) : 'Free',
                        'interval' => $plan->interval,
                        'description' => $plan->description,
                    ] : null,
                ],
            ]);
        }
    }

    /**
     * Cancel subscription at period end
     */
    public function cancel(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        
        $subscription = $user->subscription('default');
        
        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No active subscription found',
            ], 404);
        }
        
        $subscription->cancel();
        
        return response()->json([
            'success' => true,
            'message' => 'Subscription will be cancelled at the end of the billing period',
        ]);
    }

    /**
     * Resume cancelled subscription
     */
    public function resume(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        
        $subscription = $user->subscription('default');
        
        if (!$subscription) {
            return response()->json([
                'success' => false,
                'message' => 'No subscription found',
            ], 404);
        }
        
        if (!$subscription->cancel_at_period_end) {
            return response()->json([
                'success' => false,
                'message' => 'Subscription is not scheduled for cancellation',
            ], 400);
        }
        
        $subscription->resume();
        
        return response()->json([
            'success' => true,
            'message' => 'Subscription has been resumed',
        ]);
    }
}

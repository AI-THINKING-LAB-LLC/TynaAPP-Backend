<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Notifications\SubscriptionNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Cashier\Exceptions\IncompletePayment;

class SubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
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

        $user->createOrGetStripeCustomer();

        $plan = null;
        if (! empty($data['plan_id'])) {
            $plan = Plan::whereKey($data['plan_id'])->first();
        }

        $priceId = $plan?->stripe_price_id ?? $data['price_id'] ?? null;
        if (empty($priceId)) {
            return response()->json([
                'error' => 'missing_price_id',
                'message' => 'A price_id or plan_id with stripe_price_id is required.',
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
            'session_id' => $checkout->id,
        ], 201);
    }
}

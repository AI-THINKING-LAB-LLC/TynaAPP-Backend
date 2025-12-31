<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlanController extends Controller
{
    /**
     * Get all active plans
     */
    public function index(Request $request): JsonResponse
    {
        $interval = $request->get('interval'); // 'month' or 'year'
        
        $query = Plan::where('active', true);
        
        if ($interval) {
            $query->where('interval', $interval);
        }
        
        $plans = $query->orderBy('amount', 'asc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $plans->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'stripe_product_id' => $plan->stripe_product_id,
                    'stripe_price_id' => $plan->stripe_price_id,
                    'interval' => $plan->interval,
                    'amount' => $plan->amount, // in cents
                    'amount_formatted' => $plan->amount ? '$' . number_format($plan->amount / 100, 2) : 'Free',
                    'currency' => $plan->currency,
                    'trial_days' => $plan->trial_days,
                    'quota' => $plan->quota,
                    'minutes' => $plan->minutes,
                    'allow_promotion_codes' => $plan->allow_promotion_codes,
                    'description' => $plan->description,
                    'active' => $plan->active,
                ];
            }),
        ]);
    }

    /**
     * Get a single plan
     */
    public function show(Plan $plan): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $plan->id,
                'name' => $plan->name,
                'stripe_product_id' => $plan->stripe_product_id,
                'stripe_price_id' => $plan->stripe_price_id,
                'interval' => $plan->interval,
                'amount' => $plan->amount,
                'amount_formatted' => $plan->amount ? '$' . number_format($plan->amount / 100, 2) : 'Free',
                'currency' => $plan->currency,
                'trial_days' => $plan->trial_days,
                'allow_promotion_codes' => $plan->allow_promotion_codes,
                'description' => $plan->description,
                'active' => $plan->active,
            ],
        ]);
    }
}


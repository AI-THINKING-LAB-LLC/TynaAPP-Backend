<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'stripe_product_id',
        'stripe_price_id',
        'interval',
        'amount',
        'currency',
        'trial_days',
        'allow_promotion_codes',
        'active',
        'description',
    ];
}

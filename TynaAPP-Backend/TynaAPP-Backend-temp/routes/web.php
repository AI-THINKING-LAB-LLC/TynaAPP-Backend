<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Stripe Checkout return routes (public)
Route::get('/checkout/success', function () {
    return response('Paiement réussi. Merci !', 200);
})->name('checkout.success');

Route::get('/checkout/cancel', function () {
    return response('Paiement annulé.', 200);
})->name('checkout.cancel');

// Stripe webhook (handled by Laravel Cashier)
Route::post(
    '/stripe/webhook',
    [\Laravel\Cashier\Http\Controllers\WebhookController::class, 'handleWebhook']
)->name('cashier.webhook');

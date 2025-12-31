<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;

Route::get('/', function () {
    // Si l'utilisateur est authentifié, rediriger vers le panel admin
    if (Auth::check()) {
        return redirect('/tynaadm');
    }
    return view('welcome');
});

// Route home pour la redirection après authentification
Route::get('/home', function () {
    return redirect('/tynaadm');
})->name('home');

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

<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class NumberPatchServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Si intl n'est pas disponible, on remplace la classe Number
        if (!extension_loaded('intl')) {
            // Charger notre classe de remplacement AVANT que Laravel ne charge la sienne
            require_once __DIR__ . '/../Support/Number.php';
        }
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}


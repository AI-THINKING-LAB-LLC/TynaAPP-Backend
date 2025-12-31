<?php

namespace App\Providers;

use Illuminate\Support\Number;
use Illuminate\Support\ServiceProvider;

class NumberServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Si l'extension intl n'est pas disponible, on remplace Number::format()
        if (!extension_loaded('intl')) {
            // Créer une macro pour Number qui utilise number_format() natif
            Number::macro('formatWithoutIntl', function ($number, $decimals = 0, $decimalsSeparator = '.', $thousandsSeparator = ',') {
                return number_format((float) $number, $decimals, $decimalsSeparator, $thousandsSeparator);
            });
        }
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Si intl n'est pas disponible, on intercepte les appels à Number::format()
        if (!extension_loaded('intl')) {
            // Utiliser un trait ou une classe wrapper pour remplacer Number
            $this->app->bind(\Illuminate\Support\Number::class, function () {
                return new class extends Number {
                    public static function format($number, $decimals = 0, $locale = null, $style = null, $currency = null)
                    {
                        // Utiliser number_format() natif PHP
                        return number_format((float) $number, $decimals);
                    }
                };
            });
        }
    }
}


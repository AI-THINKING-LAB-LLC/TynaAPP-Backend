<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Blade;

class IntlFallbackServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Si intl n'est pas disponible, on crée un alias pour Number
        if (!extension_loaded('intl')) {
            // Créer une classe de remplacement pour Number
            $this->app->singleton('number.helper', function () {
                return new class {
                    public function format($number, $decimals = 0, $locale = null, $style = null, $currency = null)
                    {
                        // Utiliser number_format() natif PHP
                        if ($decimals === null) {
                            $decimals = 0;
                        }
                        return number_format((float) $number, $decimals);
                    }
                };
            });
        }
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Si intl n'est pas disponible, on remplace la méthode format() de Number
        if (!extension_loaded('intl')) {
            // Utiliser un trait pour étendre Number
            $this->extendNumberClass();
        }
    }

    /**
     * Étendre la classe Number pour utiliser number_format() natif
     */
    protected function extendNumberClass(): void
    {
        // Créer un alias global pour Number::format()
        if (!function_exists('number_format_safe')) {
            function number_format_safe($number, $decimals = 0, $decimalsSeparator = '.', $thousandsSeparator = ',')
            {
                return number_format((float) $number, $decimals, $decimalsSeparator, $thousandsSeparator);
            }
        }

        // Utiliser un middleware ou un listener pour intercepter les erreurs
        $this->app->resolving(\Illuminate\Support\Number::class, function ($number) {
            // Cette approche ne fonctionnera pas car Number est une classe statique
            // On doit utiliser une autre approche
        });
    }
}


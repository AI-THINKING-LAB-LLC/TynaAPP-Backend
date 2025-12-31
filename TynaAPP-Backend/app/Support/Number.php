<?php

namespace Illuminate\Support;

use RuntimeException;

/**
 * Classe de remplacement pour Number qui n'utilise pas intl
 * Utilise number_format() natif PHP au lieu de l'extension intl
 */
class Number
{
    /**
     * Format a number using the native PHP number_format() function
     * instead of requiring the intl extension.
     *
     * @param  int|float  $number
     * @param  int|null  $decimals
     * @param  string|null  $locale
     * @param  int|null  $style
     * @param  string|null  $currency
     * @return string
     */
    public static function format($number, $decimals = null, $locale = null, $style = null, $currency = null)
    {
        // Utiliser number_format() natif PHP
        $decimals = $decimals ?? 0;
        
        // Si locale est fournie, on peut essayer de formater selon la locale
        // mais sans intl, on utilise le format par défaut
        return number_format((float) $number, $decimals);
    }

    /**
     * Format a number as currency.
     */
    public static function currency($number, $currency = 'USD', $locale = null)
    {
        $formatted = self::format($number, 2);
        return $currency . ' ' . $formatted;
    }

    /**
     * Format a number as a percentage.
     */
    public static function percentage($number, $decimals = 0, $locale = null)
    {
        return self::format($number, $decimals) . '%';
    }

    /**
     * Format a number as file size.
     */
    public static function fileSize($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    /**
     * Format a number as human-readable.
     */
    public static function abbreviate($number, $precision = 0)
    {
        $abbrevs = [12 => 'T', 9 => 'B', 6 => 'M', 3 => 'K', 0 => ''];
        foreach ($abbrevs as $exponent => $abbrev) {
            if (abs($number) >= pow(10, $exponent)) {
                $display = $number / pow(10, $exponent);
                $decimals = ($exponent >= 3 && round($display) < 100) ? 1 : 0;
                return number_format($display, $decimals) . $abbrev;
            }
        }
        return number_format($number, $precision);
    }
}


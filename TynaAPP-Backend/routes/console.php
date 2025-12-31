<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\SyncSupabaseDataJob;

Schedule::command('inspire')->hourly();

// Synchronisation automatique Supabase toutes les 5 minutes
Schedule::job(new SyncSupabaseDataJob)
    ->everyFiveMinutes()
    ->name('supabase-auto-sync')
    ->withoutOverlapping();

// Alternative: Synchronisation toutes les minutes (pour temps réel)
// Décommentez si vous voulez une synchronisation plus fréquente
// Schedule::job(new SyncSupabaseDataJob)
//     ->everyMinute()
//     ->name('supabase-auto-sync-realtime')
//     ->withoutOverlapping();

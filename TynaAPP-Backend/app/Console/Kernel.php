<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Synchronisation automatique Supabase toutes les 5 minutes
        $schedule->job(new \App\Jobs\SyncSupabaseDataJob)
            ->everyFiveMinutes()
            ->name('supabase-auto-sync')
            ->withoutOverlapping();

        // Alternative: Synchronisation toutes les minutes (pour temps réel)
        // Décommentez si vous voulez une synchronisation plus fréquente
        // $schedule->job(new \App\Jobs\SyncSupabaseDataJob)
        //     ->everyMinute()
        //     ->name('supabase-auto-sync-realtime')
        //     ->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}


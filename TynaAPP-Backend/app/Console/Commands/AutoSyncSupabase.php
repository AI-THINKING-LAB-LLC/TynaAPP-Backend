<?php

namespace App\Console\Commands;

use App\Jobs\SyncSupabaseDataJob;
use Illuminate\Console\Command;

class AutoSyncSupabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'supabase:auto-sync';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically sync data from Supabase (runs in background)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔄 Dispatching automatic Supabase sync job...');
        
        SyncSupabaseDataJob::dispatch();
        
        $this->info('✅ Sync job dispatched successfully');
        
        return Command::SUCCESS;
    }
}


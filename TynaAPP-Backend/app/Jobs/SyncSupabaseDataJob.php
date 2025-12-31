<?php

namespace App\Jobs;

use App\Services\SupabaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncSupabaseDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(SupabaseService $supabaseService): void
    {
        Log::info('🔄 Starting automatic Supabase sync job...');

        try {
            // Désactiver foreign keys pour SQLite
            if (config('database.default') === 'sqlite') {
                \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = OFF');
            }

            // 1. Synchroniser tous les profiles
            $profiles = $supabaseService->request('GET', 'profiles?select=*&order=created_at.desc');
            $profilesCount = 0;

            foreach ($profiles as $profileData) {
                try {
                    \App\Models\Profile::updateOrCreate(
                        ['id' => $profileData['id']],
                        [
                            'email' => $profileData['email'] ?? null,
                            'full_name' => $profileData['full_name'] ?? null,
                            'avatar_url' => $profileData['avatar_url'] ?? null,
                            'created_at' => isset($profileData['created_at']) ? $profileData['created_at'] : now(),
                            'updated_at' => isset($profileData['updated_at']) ? $profileData['updated_at'] : now(),
                        ]
                    );
                    $profilesCount++;
                } catch (\Exception $e) {
                    Log::warning('Failed to sync profile in job', [
                        'profile_id' => $profileData['id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // 2. Synchroniser toutes les réunions et leurs données associées
            $totalMeetings = 0;
            $totalMessages = 0;
            $totalTranscripts = 0;
            $totalSummaries = 0;

            foreach ($profiles as $profile) {
                try {
                    $userId = $profile['id'];
                    $stats = $supabaseService->syncAllDataToLaravel($userId);
                    
                    $totalMeetings += $stats['meetings'];
                    $totalMessages += $stats['chat_messages'];
                    $totalTranscripts += $stats['transcripts'];
                    $totalSummaries += $stats['meeting_summaries'];
                } catch (\Exception $e) {
                    Log::warning('Failed to sync user data in job', [
                        'user_id' => $profile['id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);
                    continue;
                }
            }

            // Réactiver foreign keys
            if (config('database.default') === 'sqlite') {
                \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');
            }

            Log::info('✅ Automatic sync completed', [
                'profiles' => $profilesCount,
                'meetings' => $totalMeetings,
                'messages' => $totalMessages,
                'transcripts' => $totalTranscripts,
                'summaries' => $totalSummaries,
            ]);
        } catch (\Exception $e) {
            // Réactiver foreign keys en cas d'erreur
            if (config('database.default') === 'sqlite') {
                \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');
            }

            Log::error('❌ Automatic sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}


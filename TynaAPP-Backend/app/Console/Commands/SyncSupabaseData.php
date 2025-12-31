<?php

namespace App\Console\Commands;

use App\Services\SupabaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncSupabaseData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'supabase:sync 
                            {--all : Sync all data from Supabase}
                            {--users : Sync users/profiles only}
                            {--meetings : Sync meetings only}
                            {--user-id= : Sync data for a specific user ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize data from Supabase to Laravel database';

    /**
     * Execute the console command.
     */
    public function handle(SupabaseService $supabaseService): int
    {
        $this->info('🔄 Starting Supabase data synchronization...');
        $this->newLine();

        try {
            if ($this->option('all')) {
                return $this->syncAll($supabaseService);
            }

            if ($this->option('users')) {
                return $this->syncUsers($supabaseService);
            }

            if ($this->option('meetings')) {
                return $this->syncMeetings($supabaseService);
            }

            if ($userId = $this->option('user-id')) {
                return $this->syncUserData($supabaseService, $userId);
            }

            // Par défaut, synchroniser tout
            return $this->syncAll($supabaseService);
        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            Log::error('Supabase sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Synchronize all data
     */
    protected function syncAll(SupabaseService $supabaseService): int
    {
        $this->info('📥 Synchronizing all data from Supabase...');
        $this->newLine();

        // 1. Synchronize all profiles/users
        $this->info('👥 Step 1: Synchronizing users/profiles...');
        $usersCount = $this->syncUsers($supabaseService);
        if ($usersCount === Command::FAILURE) {
            return Command::FAILURE;
        }
        $this->newLine();

        // 2. Get all user IDs and sync their meetings
        $this->info('📅 Step 2: Synchronizing meetings for all users...');
        $profiles = \App\Models\Profile::all();
        $totalMeetings = 0;
        $totalMessages = 0;
        $totalTranscripts = 0;
        $totalSummaries = 0;

        $bar = $this->output->createProgressBar($profiles->count());
        $bar->start();

        foreach ($profiles as $profile) {
            try {
                $stats = $supabaseService->syncAllDataToLaravel($profile->id);
                $totalMeetings += $stats['meetings'];
                $totalMessages += $stats['chat_messages'];
                $totalTranscripts += $stats['transcripts'];
                $totalSummaries += $stats['meeting_summaries'];
            } catch (\Exception $e) {
                $this->warn("\n⚠️  Failed to sync data for user {$profile->id}: " . $e->getMessage());
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // 3. Summary
        $this->info('✅ Synchronization complete!');
        $this->table(
            ['Type', 'Count'],
            [
                ['Users/Profiles', $usersCount],
                ['Meetings', $totalMeetings],
                ['Chat Messages', $totalMessages],
                ['Transcripts', $totalTranscripts],
                ['Meeting Summaries', $totalSummaries],
            ]
        );

        return Command::SUCCESS;
    }

    /**
     * Synchronize users/profiles only
     */
    protected function syncUsers(SupabaseService $supabaseService): int
    {
        try {
            $this->info('📥 Fetching all profiles from Supabase...');
            
            // Récupérer tous les profiles depuis Supabase
            $profiles = $supabaseService->request('GET', 'profiles?select=*&order=created_at.desc');
            
            if (empty($profiles)) {
                $this->warn('⚠️  No profiles found in Supabase');
                return Command::SUCCESS;
            }

            $this->info("Found {$count = count($profiles)} profile(s) in Supabase");
            $this->newLine();

            $bar = $this->output->createProgressBar($count);
            $bar->start();

            $synced = 0;
            foreach ($profiles as $profileData) {
                try {
                    \App\Models\Profile::updateOrCreate(
                        ['id' => $profileData['id']],
                        [
                            'email' => $profileData['email'] ?? null,
                            'full_name' => $profileData['full_name'] ?? null,
                            'avatar_url' => $profileData['avatar_url'] ?? null,
                            'created_at' => $profileData['created_at'] ?? now(),
                            'updated_at' => $profileData['updated_at'] ?? now(),
                        ]
                    );
                    $synced++;
                } catch (\Exception $e) {
                    $this->warn("\n⚠️  Failed to sync profile {$profileData['id']}: " . $e->getMessage());
                }
                $bar->advance();
            }

            $bar->finish();
            $this->newLine(2);
            $this->info("✅ Synchronized {$synced}/{$count} profiles");

            return $synced;
        } catch (\Exception $e) {
            $this->error('❌ Error syncing users: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Synchronize meetings only
     */
    protected function syncMeetings(SupabaseService $supabaseService): int
    {
        $this->info('📥 Fetching all meetings from Supabase...');
        
        try {
            $meetings = $supabaseService->request('GET', 'meetings?select=*&order=started_at.desc');
            
            if (empty($meetings)) {
                $this->warn('⚠️  No meetings found in Supabase');
                return Command::SUCCESS;
            }

            $this->info("Found {$count = count($meetings)} meeting(s) in Supabase");
            $this->newLine();

            $bar = $this->output->createProgressBar($count);
            $bar->start();

            $synced = 0;
            foreach ($meetings as $meetingData) {
                try {
                    \App\Models\Meeting::updateOrCreate(
                        ['id' => $meetingData['id']],
                        [
                            'user_id' => $meetingData['user_id'] ?? null,
                            'title' => $meetingData['title'] ?? 'Untitled Meeting',
                            'status' => $meetingData['status'] ?? 'ended',
                            'started_at' => $meetingData['started_at'] ?? now(),
                            'ended_at' => $meetingData['ended_at'] ?? null,
                            'duration_seconds' => $meetingData['duration_seconds'] ?? null,
                            'created_at' => $meetingData['created_at'] ?? now(),
                            'updated_at' => $meetingData['updated_at'] ?? now(),
                        ]
                    );
                    $synced++;
                } catch (\Exception $e) {
                    $this->warn("\n⚠️  Failed to sync meeting {$meetingData['id']}: " . $e->getMessage());
                }
                $bar->advance();
            }

            $bar->finish();
            $this->newLine(2);
            $this->info("✅ Synchronized {$synced}/{$count} meetings");

            return $synced;
        } catch (\Exception $e) {
            $this->error('❌ Error syncing meetings: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Synchronize data for a specific user
     */
    protected function syncUserData(SupabaseService $supabaseService, string $userId): int
    {
        $this->info("📥 Synchronizing data for user: {$userId}");
        $this->newLine();

        try {
            $stats = $supabaseService->syncAllDataToLaravel($userId);

            $this->info('✅ Synchronization complete!');
            $this->table(
                ['Type', 'Count'],
                [
                    ['Profiles', $stats['profiles']],
                    ['Meetings', $stats['meetings']],
                    ['Chat Messages', $stats['chat_messages']],
                    ['Transcripts', $stats['transcripts']],
                    ['Meeting Summaries', $stats['meeting_summaries']],
                ]
            );

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}


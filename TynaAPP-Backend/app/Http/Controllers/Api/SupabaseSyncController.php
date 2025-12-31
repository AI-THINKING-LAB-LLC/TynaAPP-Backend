<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SupabaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupabaseSyncController extends Controller
{
    public function __construct(
        private SupabaseService $supabaseService
    ) {}

    /**
     * Sync all data from Supabase to Laravel database
     */
    public function sync(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['sometimes', 'string'],
            'sync_all' => ['sometimes', 'boolean'],
        ]);

        try {
            if ($request->boolean('sync_all') || !$request->has('user_id')) {
                // Synchroniser toutes les données
                return $this->syncAllData();
            }

            // Synchroniser pour un utilisateur spécifique
            $stats = $this->supabaseService->syncAllDataToLaravel($request->user_id);

            return response()->json([
                'success' => true,
                'message' => 'Data synced successfully from Supabase',
                'stats' => $stats,
            ]);
        } catch (\Exception $e) {
            Log::error('Supabase sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync data: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sync all data from Supabase (all users) - endpoint dédié
     */
    public function syncAll(): JsonResponse
    {
        return $this->syncAllData();
    }

    /**
     * Sync all data from Supabase (all users)
     */
    protected function syncAllData(): JsonResponse
    {
        try {
            Log::info('Starting full Supabase sync...');

            // 1. Synchroniser tous les profiles
            $this->info('Fetching all profiles from Supabase...');
            $profiles = $this->supabaseService->request('GET', 'profiles?select=*&order=created_at.desc');
            
            if (empty($profiles)) {
                return response()->json([
                    'success' => true,
                    'message' => 'No profiles found in Supabase',
                    'stats' => [
                        'profiles' => 0,
                        'meetings' => 0,
                        'chat_messages' => 0,
                        'transcripts' => 0,
                        'meeting_summaries' => 0,
                    ],
                ]);
            }

            Log::info('Found profiles in Supabase', ['count' => count($profiles)]);

            $profilesCount = 0;
            // Désactiver les foreign keys pour SQLite
            \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = OFF');
            
            foreach ($profiles as $profileData) {
                try {
                    $profile = \App\Models\Profile::updateOrCreate(
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
                    Log::info('Profile synced', ['id' => $profile->id, 'email' => $profile->email]);
                } catch (\Exception $e) {
                    Log::error('Failed to sync profile', [
                        'profile_id' => $profileData['id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);
                }
            }
            
            // Réactiver les foreign keys
            \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');

            Log::info('Synced profiles', ['count' => $profilesCount]);

            // 2. Synchroniser toutes les réunions et leurs données associées
            $totalMeetings = 0;
            $totalMessages = 0;
            $totalTranscripts = 0;
            $totalSummaries = 0;

            foreach ($profiles as $profile) {
                try {
                    $userId = $profile['id'];
                    Log::info('Syncing data for user', ['user_id' => $userId]);
                    
                    $stats = $this->supabaseService->syncAllDataToLaravel($userId);
                    
                    $totalMeetings += $stats['meetings'];
                    $totalMessages += $stats['chat_messages'];
                    $totalTranscripts += $stats['transcripts'];
                    $totalSummaries += $stats['meeting_summaries'];
                } catch (\Exception $e) {
                    Log::warning('Failed to sync data for user', [
                        'user_id' => $profile['id'] ?? 'unknown',
                        'error' => $e->getMessage(),
                    ]);
                    // Continuer avec les autres utilisateurs
                    continue;
                }
            }

            Log::info('Full sync completed', [
                'profiles' => $profilesCount,
                'meetings' => $totalMeetings,
                'messages' => $totalMessages,
                'transcripts' => $totalTranscripts,
                'summaries' => $totalSummaries,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'All data synced successfully from Supabase',
                'stats' => [
                    'profiles' => $profilesCount,
                    'meetings' => $totalMeetings,
                    'chat_messages' => $totalMessages,
                    'transcripts' => $totalTranscripts,
                    'meeting_summaries' => $totalSummaries,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Full sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync all data: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get meetings from Supabase (without syncing to Laravel DB)
     */
    public function getMeetings(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['required', 'string'],
        ]);

        try {
            $meetings = $this->supabaseService->getMeetings($request->user_id);

            return response()->json([
                'success' => true,
                'data' => $meetings,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get meetings: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get a single meeting from Supabase
     */
    public function getMeeting(string $meetingId): JsonResponse
    {
        try {
            $meeting = $this->supabaseService->getMeeting($meetingId);

            if (!$meeting) {
                return response()->json([
                    'success' => false,
                    'message' => 'Meeting not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $meeting,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get meeting: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper method for logging
     */
    protected function info(string $message, array $context = []): void
    {
        Log::info($message, $context);
    }
}


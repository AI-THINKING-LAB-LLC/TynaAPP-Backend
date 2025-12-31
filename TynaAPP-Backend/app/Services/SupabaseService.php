<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupabaseService
{
    private string $supabaseUrl;
    private string $supabaseKey;
    private string $apiUrl;

    public function __construct()
    {
        $this->supabaseUrl = env('SUPABASE_URL', 'https://qbynbepgimcmgrljyfqw.supabase.co');
        // Utiliser service_role key si disponible (bypass RLS), sinon anon key
        $this->supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY') ?: env('SUPABASE_ANON_KEY', '');
        $this->apiUrl = rtrim($this->supabaseUrl, '/') . '/rest/v1';
    }

    /**
     * Make authenticated request to Supabase API
     */
    public function request(string $method, string $endpoint, array $data = [], ?string $token = null): array
    {
        $headers = [
            'apikey' => $this->supabaseKey,
            'Authorization' => 'Bearer ' . ($token ?? $this->supabaseKey),
            'Content-Type' => 'application/json',
            'Prefer' => 'return=representation',
        ];

        $url = $this->apiUrl . '/' . ltrim($endpoint, '/');

        try {
            $response = Http::withHeaders($headers)->{strtolower($method)}($url, $data);

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            Log::error('Supabase API error', [
                'method' => $method,
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new \Exception('Supabase API error: ' . $response->status());
        } catch (\Exception $e) {
            Log::error('Supabase request failed', [
                'error' => $e->getMessage(),
                'endpoint' => $endpoint,
            ]);
            throw $e;
        }
    }

    /**
     * Get user profile by ID
     */
    public function getProfile(string $userId): ?array
    {
        try {
            $result = $this->request('GET', "profiles?id=eq.{$userId}&select=*");
            return $result[0] ?? null;
        } catch (\Exception $e) {
            Log::error('Failed to get profile', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Get all meetings for a user
     */
    public function getMeetings(string $userId): array
    {
        try {
            return $this->request('GET', "meetings?user_id=eq.{$userId}&select=*,transcripts(*),meeting_summaries(*),chat_messages(*)&order=started_at.desc");
        } catch (\Exception $e) {
            Log::error('Failed to get meetings', ['user_id' => $userId, 'error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Get a single meeting by ID
     */
    public function getMeeting(string $meetingId): ?array
    {
        try {
            $result = $this->request('GET', "meetings?id=eq.{$meetingId}&select=*,transcripts(*),meeting_summaries(*),chat_messages(*)");
            return $result[0] ?? null;
        } catch (\Exception $e) {
            Log::error('Failed to get meeting', ['meeting_id' => $meetingId, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Create a meeting in Supabase
     */
    public function createMeeting(array $meetingData): ?array
    {
        try {
            $result = $this->request('POST', 'meetings', $meetingData);
            return is_array($result) && isset($result[0]) ? $result[0] : $result;
        } catch (\Exception $e) {
            Log::error('Failed to create meeting', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Update a meeting in Supabase
     */
    public function updateMeeting(string $meetingId, array $meetingData): ?array
    {
        try {
            $result = $this->request('PATCH', "meetings?id=eq.{$meetingId}", $meetingData);
            return is_array($result) && isset($result[0]) ? $result[0] : null;
        } catch (\Exception $e) {
            Log::error('Failed to update meeting', ['meeting_id' => $meetingId, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Get chat messages for a meeting
     */
    public function getChatMessages(string $meetingId): array
    {
        try {
            return $this->request('GET', "chat_messages?meeting_id=eq.{$meetingId}&order=created_at.asc");
        } catch (\Exception $e) {
            Log::error('Failed to get chat messages', ['meeting_id' => $meetingId, 'error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Create a chat message in Supabase
     */
    public function createChatMessage(array $messageData): ?array
    {
        try {
            $result = $this->request('POST', 'chat_messages', $messageData);
            return is_array($result) && isset($result[0]) ? $result[0] : $result;
        } catch (\Exception $e) {
            Log::error('Failed to create chat message', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Get transcripts for a meeting
     */
    public function getTranscripts(string $meetingId): array
    {
        try {
            return $this->request('GET', "transcripts?meeting_id=eq.{$meetingId}&order=created_at.asc");
        } catch (\Exception $e) {
            Log::error('Failed to get transcripts', ['meeting_id' => $meetingId, 'error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Create a transcript in Supabase
     */
    public function createTranscript(array $transcriptData): ?array
    {
        try {
            $result = $this->request('POST', 'transcripts', $transcriptData);
            return is_array($result) && isset($result[0]) ? $result[0] : $result;
        } catch (\Exception $e) {
            Log::error('Failed to create transcript', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Get meeting summary
     */
    public function getMeetingSummary(string $meetingId): ?array
    {
        try {
            $result = $this->request('GET', "meeting_summaries?meeting_id=eq.{$meetingId}");
            return $result[0] ?? null;
        } catch (\Exception $e) {
            Log::error('Failed to get meeting summary', ['meeting_id' => $meetingId, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Create or update meeting summary
     */
    public function upsertMeetingSummary(array $summaryData): ?array
    {
        try {
            $result = $this->request('POST', 'meeting_summaries', $summaryData);
            return is_array($result) && isset($result[0]) ? $result[0] : $result;
        } catch (\Exception $e) {
            // Try update if insert fails
            if (isset($summaryData['meeting_id'])) {
                try {
                    return $this->updateMeetingSummary($summaryData['meeting_id'], $summaryData);
                } catch (\Exception $e2) {
                    Log::error('Failed to upsert meeting summary', ['error' => $e2->getMessage()]);
                }
            }
            return null;
        }
    }

    /**
     * Update meeting summary
     */
    public function updateMeetingSummary(string $meetingId, array $summaryData): ?array
    {
        try {
            $result = $this->request('PATCH', "meeting_summaries?meeting_id=eq.{$meetingId}", $summaryData);
            return is_array($result) && isset($result[0]) ? $result[0] : null;
        } catch (\Exception $e) {
            Log::error('Failed to update meeting summary', ['meeting_id' => $meetingId, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Sync all data from Supabase to Laravel database
     */
    public function syncAllDataToLaravel(string $userId): array
    {
        $stats = [
            'profiles' => 0,
            'meetings' => 0,
            'chat_messages' => 0,
            'transcripts' => 0,
            'meeting_summaries' => 0,
        ];

        try {
            // Sync profile
            $profile = $this->getProfile($userId);
            if ($profile) {
                \App\Models\Profile::updateOrCreate(
                    ['id' => $profile['id']],
                    [
                        'email' => $profile['email'],
                        'full_name' => $profile['full_name'] ?? null,
                        'avatar_url' => $profile['avatar_url'] ?? null,
                    ]
                );
                $stats['profiles'] = 1;
            }

            // Sync meetings
            $meetings = $this->getMeetings($userId);
            foreach ($meetings as $meeting) {
                \App\Models\Meeting::updateOrCreate(
                    ['id' => $meeting['id']],
                    [
                        'user_id' => $meeting['user_id'],
                        'title' => $meeting['title'],
                        'status' => $meeting['status'] ?? 'ended',
                        'started_at' => $meeting['started_at'] ?? now(),
                        'ended_at' => $meeting['ended_at'] ?? null,
                        'duration_seconds' => $meeting['duration_seconds'] ?? null,
                        'created_at' => $meeting['created_at'] ?? now(),
                    ]
                );
                $stats['meetings']++;

                // Sync transcripts
                if (isset($meeting['transcripts']) && is_array($meeting['transcripts'])) {
                    foreach ($meeting['transcripts'] as $transcript) {
                        \App\Models\Transcript::updateOrCreate(
                            ['id' => $transcript['id']],
                            [
                                'meeting_id' => $transcript['meeting_id'],
                                'speaker' => $transcript['speaker'],
                                'text' => $transcript['text'],
                                'timestamp' => $transcript['timestamp'],
                                'language_code' => $transcript['language_code'] ?? null,
                                'confidence' => $transcript['confidence'] ?? null,
                                'created_at' => $transcript['created_at'] ?? now(),
                            ]
                        );
                        $stats['transcripts']++;
                    }
                }

                // Sync chat messages
                if (isset($meeting['chat_messages']) && is_array($meeting['chat_messages'])) {
                    foreach ($meeting['chat_messages'] as $message) {
                        \App\Models\ChatMessage::updateOrCreate(
                            ['id' => $message['id']],
                            [
                                'meeting_id' => $message['meeting_id'],
                                'role' => $message['role'],
                                'content' => $message['content'],
                                'created_at' => $message['created_at'] ?? now(),
                            ]
                        );
                        $stats['chat_messages']++;
                    }
                }

                // Sync meeting summaries
                if (isset($meeting['meeting_summaries']) && is_array($meeting['meeting_summaries']) && count($meeting['meeting_summaries']) > 0) {
                    $summary = $meeting['meeting_summaries'][0];
                    \App\Models\MeetingSummary::updateOrCreate(
                        ['id' => $summary['id']],
                        [
                            'meeting_id' => $summary['meeting_id'],
                            'summary_text' => $summary['summary_text'] ?? $summary['summary'] ?? '',
                            'action_items' => $summary['action_items'] ?? [],
                            'user_notes' => $summary['user_notes'] ?? '',
                            'created_at' => $summary['created_at'] ?? now(),
                        ]
                    );
                    $stats['meeting_summaries']++;
                }
            }

            // Réactiver les foreign keys
            if (config('database.default') === 'sqlite') {
                \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');
            }

            return $stats;
        } catch (\Exception $e) {
            // Réactiver les foreign keys en cas d'erreur
            if (config('database.default') === 'sqlite') {
                \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');
            }
            
            Log::error('Failed to sync data from Supabase', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}


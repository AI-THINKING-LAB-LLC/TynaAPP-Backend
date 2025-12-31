<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SupabaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SupabaseRealtimeController extends Controller
{
    public function __construct(
        private SupabaseService $supabaseService
    ) {}

    /**
     * Webhook endpoint pour recevoir les notifications Supabase Realtime
     */
    public function webhook(Request $request): JsonResponse
    {
        try {
            $payload = $request->all();
            Log::info('Supabase Realtime webhook received', ['payload' => $payload]);

            // Désactiver foreign keys pour SQLite
            if (config('database.default') === 'sqlite') {
                \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = OFF');
            }

            // Traiter selon le type d'événement
            $eventType = $payload['type'] ?? null;
            $table = $payload['table'] ?? null;
            $record = $payload['record'] ?? null;

            if ($table === 'profiles' && $record) {
                \App\Models\Profile::updateOrCreate(
                    ['id' => $record['id']],
                    [
                        'email' => $record['email'] ?? null,
                        'full_name' => $record['full_name'] ?? null,
                        'avatar_url' => $record['avatar_url'] ?? null,
                    ]
                );
            } elseif ($table === 'meetings' && $record) {
                \App\Models\Meeting::updateOrCreate(
                    ['id' => $record['id']],
                    [
                        'user_id' => $record['user_id'] ?? null,
                        'title' => $record['title'] ?? 'Untitled Meeting',
                        'status' => $record['status'] ?? 'ended',
                        'started_at' => $record['started_at'] ?? now(),
                        'ended_at' => $record['ended_at'] ?? null,
                        'duration_seconds' => $record['duration_seconds'] ?? null,
                    ]
                );
            }

            // Réactiver foreign keys
            if (config('database.default') === 'sqlite') {
                \Illuminate\Support\Facades\DB::statement('PRAGMA foreign_keys = ON');
            }

            return response()->json(['success' => true, 'message' => 'Data synced']);
        } catch (\Exception $e) {
            Log::error('Supabase webhook error', [
                'error' => $e->getMessage(),
                'payload' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process webhook: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Endpoint pour forcer une synchronisation immédiate
     */
    public function syncNow(): JsonResponse
    {
        try {
            \App\Jobs\SyncSupabaseDataJob::dispatch();
            
            return response()->json([
                'success' => true,
                'message' => 'Sync job dispatched',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to dispatch sync: ' . $e->getMessage(),
            ], 500);
        }
    }
}


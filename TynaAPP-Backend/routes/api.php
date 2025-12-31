<?php

use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\MeetingSummaryController;
use App\Http\Controllers\Api\ChatMessageController;
use App\Http\Controllers\Api\TranscriptController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TokenController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\PlanController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\SupabaseSyncController;
use Illuminate\Support\Facades\Route;

// Authentication routes (public)
Route::post('register', [AuthController::class, 'register']);
// Reject GET requests to register with a clear message
Route::get('register', function () {
    return response()->json([
        'message' => 'Method not allowed. Use POST to register.',
        'error' => 'GET method is not supported for this endpoint. Please use POST.'
    ], 405);
});
Route::post('tokens', [TokenController::class, 'store']);
Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('reset-password', [AuthController::class, 'resetPassword']);
Route::post('email/verification-notification', [EmailVerificationController::class, 'send']);
Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])->name('verification.verify');

// Plans API (public - no auth required to view plans)
Route::get('plans', [PlanController::class, 'index']);
Route::get('plans/{plan}', [PlanController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    // Get authenticated user
    Route::get('user', [AuthController::class, 'user']);
    
    Route::apiResource('meetings', MeetingController::class);
    Route::apiResource('meeting-summaries', MeetingSummaryController::class);
    Route::apiResource('chat-messages', ChatMessageController::class);
    Route::apiResource('transcripts', TranscriptController::class);
    Route::apiResource('profiles', ProfileController::class);
    Route::apiResource('users', UserController::class);
    Route::get('subscriptions/current', [SubscriptionController::class, 'show']);
    Route::post('subscriptions', [SubscriptionController::class, 'store']);
    Route::post('subscriptions/cancel', [SubscriptionController::class, 'cancel']);
    Route::post('subscriptions/resume', [SubscriptionController::class, 'resume']);
    
    // Supabase sync routes (read data from Supabase API)
    Route::prefix('supabase')->group(function () {
        Route::post('sync', [SupabaseSyncController::class, 'sync']); // ?user_id=xxx ou ?sync_all=true
        Route::post('sync-all', [SupabaseSyncController::class, 'syncAll']); // Synchroniser toutes les données
        Route::post('sync-now', [\App\Http\Controllers\Api\SupabaseRealtimeController::class, 'syncNow']); // Forcer sync immédiate
        Route::get('meetings', [SupabaseSyncController::class, 'getMeetings']);
        Route::get('meetings/{meetingId}', [SupabaseSyncController::class, 'getMeeting']);
    });
    
    // Webhook Supabase Realtime (pas besoin d'auth)
    Route::post('supabase/webhook', [\App\Http\Controllers\Api\SupabaseRealtimeController::class, 'webhook']);
});

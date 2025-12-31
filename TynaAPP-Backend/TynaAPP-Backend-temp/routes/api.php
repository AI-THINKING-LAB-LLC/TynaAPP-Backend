<?php

use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\MeetingSummaryController;
use App\Http\Controllers\Api\ChatMessageController;
use App\Http\Controllers\Api\TranscriptController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TokenController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::post('tokens', [TokenController::class, 'store']);
Route::post('email/verification-notification', [EmailVerificationController::class, 'send']);
Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])->name('verification.verify');

Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('meetings', MeetingController::class);
    Route::apiResource('meeting-summaries', MeetingSummaryController::class);
    Route::apiResource('chat-messages', ChatMessageController::class);
    Route::apiResource('transcripts', TranscriptController::class);
    Route::apiResource('profiles', ProfileController::class);
    Route::apiResource('users', UserController::class);
    Route::post('subscriptions', [SubscriptionController::class, 'store']);
});

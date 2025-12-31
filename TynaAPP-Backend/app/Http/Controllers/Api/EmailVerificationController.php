<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\WelcomeNotification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class EmailVerificationController extends Controller
{
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        /** @var User|null $user */
        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->getKey(), 'hash' => sha1($user->getEmailForVerification())]
        );

        $user->notify(new \App\Notifications\AccountValidationNotification($verificationUrl));

        return response()->json([
            'message' => 'Verification email sent',
            'verification_url' => $verificationUrl, // utile en dev/testing
        ]);
    }

    public function verify(Request $request, int $id, string $hash): JsonResponse
    {
        /** @var User|null $user */
        $user = User::find($id);

        if (! $user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if (! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return response()->json(['message' => 'Invalid verification link'], 400);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email already verified'], 200);
        }

        $user->forceFill(['email_verified_at' => now()])->save();

        event(new Verified($user));

        $user->notify(new WelcomeNotification());

        return response()->json(['message' => 'Email verified']);
    }
}

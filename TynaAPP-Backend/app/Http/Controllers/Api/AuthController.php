<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Profile;
use App\Services\PlanAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        // Créer ou mettre à jour le profil associé
        // Utiliser l'email comme clé car c'est unique et peut exister déjà (migration Supabase)
        try {
            Profile::updateOrCreate(
                ['email' => $user->email], // Condition de recherche par email (unique)
                [
                    'id' => (string) $user->id, // Convertir l'ID utilisateur en string
                    'full_name' => $data['name'],
                    'avatar_url' => '',
                ]
            );
        } catch (\Exception $e) {
            // Si l'email existe déjà avec un ID différent, mettre à jour l'ID
            Log::warning('Profile creation issue', [
                'user_id' => $user->id,
                'email' => $user->email,
                'error' => $e->getMessage()
            ]);
            
            // Essayer de mettre à jour le profil existant avec le nouvel ID utilisateur
            $existingProfile = Profile::where('email', $user->email)->first();
            if ($existingProfile) {
                $existingProfile->update([
                    'id' => (string) $user->id,
                    'full_name' => $data['name'],
                ]);
            } else {
                // Si ça échoue encore, créer avec un ID différent
                Profile::create([
                    'id' => (string) $user->id,
                    'email' => $user->email,
                    'full_name' => $data['name'],
                    'avatar_url' => '',
                ]);
            }
        }

        // Attribuer automatiquement le plan Starter (gratuit) au nouvel utilisateur
        PlanAssignmentService::assignStarterPlan($user);

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ], 201);
    }

    /**
     * Get the authenticated user
     */
    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        return response()->json([
            'message' => 'If the email exists, a password reset link has been sent.',
        ]);
    }

    /**
     * Reset password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successfully']);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }
}


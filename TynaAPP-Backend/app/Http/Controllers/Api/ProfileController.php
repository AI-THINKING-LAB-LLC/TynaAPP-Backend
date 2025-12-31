<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Profile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('per_page', 15);

        return response()->json(
            Profile::query()->paginate($perPage)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'string'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'email' => ['required', 'email'],
            'full_name' => ['required', 'string'],
            'avatar_url' => ['nullable', 'url'],
            'created_at' => ['nullable', 'date'],
            'updated_at' => ['nullable', 'date'],
        ]);

        $profile = Profile::create([
            'id' => $data['id'] ?? (string) $data['user_id'],
            ...$data,
        ]);

        return response()->json($profile, 201);
    }

    public function show(Profile $profile): JsonResponse
    {
        return response()->json($profile);
    }

    public function update(Request $request, Profile $profile): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'email' => ['sometimes', 'email'],
            'full_name' => ['sometimes', 'string'],
            'avatar_url' => ['sometimes', 'nullable', 'url'],
            'created_at' => ['sometimes', 'nullable', 'date'],
            'updated_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $profile->update($data);

        return response()->json($profile);
    }

    public function destroy(Profile $profile): JsonResponse
    {
        $profile->delete();

        return response()->json(null, 204);
    }
}

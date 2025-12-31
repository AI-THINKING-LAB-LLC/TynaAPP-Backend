<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class MeetingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Filtrer les meetings par user_id (l'ID du profil correspond à l'ID de l'utilisateur en string)
        $userId = (string) $user->id;
        $perPage = (int) $request->get('per_page', 15);

        $query = Meeting::query()
            ->where('user_id', $userId)
            ->orderBy('started_at', 'desc')
            ->orderBy('created_at', 'desc');

        $paginated = $query->paginate($perPage);
        
        // Log pour debugging
        Log::info('Meetings fetched for user', [
            'user_id' => $userId,
            'count' => $paginated->total(),
            'meetings' => $paginated->items(),
        ]);
        
        return response()->json($paginated);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $data = $request->validate([
            'id' => ['nullable', 'string'],
            'title' => ['required', 'string'],
            'status' => ['required', 'in:live,ended,scheduled'],
            'started_at' => ['required', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'created_at' => ['nullable', 'date'],
        ]);

        // Forcer user_id à l'ID de l'utilisateur authentifié
        $data['user_id'] = (string) $user->id;

        Log::info('Creating meeting for user', [
            'user_id' => $user->id,
            'data' => $data,
        ]);

        $meeting = Meeting::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        Log::info('Meeting created', [
            'meeting_id' => $meeting->id,
            'user_id' => $meeting->user_id,
            'title' => $meeting->title,
        ]);

        return response()->json($meeting, 201);
    }

    public function show(Request $request, $meeting): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;
        $meetingId = $meeting instanceof Meeting ? $meeting->id : $meeting;
        
        // Try to get from Laravel DB first (if route model binding worked)
        if ($meeting instanceof Meeting) {
            // Vérifier que le meeting appartient à l'utilisateur
            if ($meeting->user_id !== $userId) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            return response()->json($meeting);
        }

        // Try to find in Laravel DB
        $meetingModel = Meeting::where('id', $meetingId)
            ->where('user_id', $userId)
            ->first();
        
        if ($meetingModel) {
            return response()->json($meetingModel);
        }

        return response()->json(['message' => 'Meeting not found'], 404);
    }

    public function update(Request $request, Meeting $meeting): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le meeting appartient à l'utilisateur
        if ($meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string'],
            'status' => ['sometimes', 'in:live,ended,scheduled'],
            'started_at' => ['sometimes', 'date'],
            'ended_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:started_at'],
            'duration_seconds' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        // Ne pas permettre de changer user_id
        unset($data['user_id']);

        $meeting->update($data);

        return response()->json($meeting);
    }

    public function destroy(Request $request, Meeting $meeting): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le meeting appartient à l'utilisateur
        if ($meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $meeting->delete();

        return response()->json(null, 204);
    }
}

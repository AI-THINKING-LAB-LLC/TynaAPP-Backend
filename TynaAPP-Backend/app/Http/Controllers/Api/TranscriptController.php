<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transcript;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TranscriptController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;
        $perPage = (int) $request->get('per_page', 15);
        $meetingId = $request->get('meeting_id');

        // Filtrer les transcripts par meeting qui appartient à l'utilisateur
        $query = Transcript::query()
            ->with('meeting')
            ->whereHas('meeting', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            });

        // Si un meeting_id est fourni, filtrer aussi par meeting
        if ($meetingId) {
            $query->where('meeting_id', $meetingId);
        }

        return response()->json($query->orderBy('timestamp', 'asc')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;
        $data = $request->validate([
            'id' => ['nullable', 'string'],
            'meeting_id' => ['required', 'string'],
            'speaker' => ['required', 'string'],
            'text' => ['required', 'string'],
            'timestamp' => ['nullable', 'numeric', 'min:0'],
            'language_code' => ['nullable', 'string', 'max:10'],
            'confidence' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'created_at' => ['nullable', 'date'],
        ]);

        // Vérifier que le meeting appartient à l'utilisateur
        $meeting = \App\Models\Meeting::where('id', $data['meeting_id'])
            ->where('user_id', $userId)
            ->first();

        if (!$meeting) {
            return response()->json(['message' => 'Meeting not found or forbidden'], 403);
        }

        $transcript = Transcript::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        return response()->json($transcript->load('meeting'), 201);
    }

    public function show(Request $request, Transcript $transcript): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le transcript appartient à un meeting de l'utilisateur
        $transcript->load('meeting');
        if (!$transcript->meeting || $transcript->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($transcript);
    }

    public function update(Request $request, Transcript $transcript): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le transcript appartient à un meeting de l'utilisateur
        $transcript->load('meeting');
        if (!$transcript->meeting || $transcript->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'speaker' => ['sometimes', 'string'],
            'text' => ['sometimes', 'string'],
            'timestamp' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'language_code' => ['sometimes', 'nullable', 'string', 'max:10'],
            'confidence' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1'],
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        // Ne pas permettre de changer meeting_id
        unset($data['meeting_id']);

        $transcript->update($data);

        return response()->json($transcript->load('meeting'));
    }

    public function destroy(Request $request, Transcript $transcript): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le transcript appartient à un meeting de l'utilisateur
        $transcript->load('meeting');
        if (!$transcript->meeting || $transcript->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $transcript->delete();

        return response()->json(null, 204);
    }
}

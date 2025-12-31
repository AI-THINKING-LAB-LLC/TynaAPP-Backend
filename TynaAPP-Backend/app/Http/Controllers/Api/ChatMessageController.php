<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatMessageController extends Controller
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

        // Filtrer les messages par meeting qui appartient à l'utilisateur
        $query = ChatMessage::query()
            ->with('meeting')
            ->whereHas('meeting', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            });

        // Si un meeting_id est fourni, filtrer aussi par meeting
        if ($meetingId) {
            $query->where('meeting_id', $meetingId);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate($perPage));
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
            'role' => ['required', 'in:user,assistant,system'],
            'content' => ['required', 'string'],
            'created_at' => ['nullable', 'date'],
        ]);

        // Vérifier que le meeting appartient à l'utilisateur
        $meeting = \App\Models\Meeting::where('id', $data['meeting_id'])
            ->where('user_id', $userId)
            ->first();

        if (!$meeting) {
            return response()->json(['message' => 'Meeting not found or forbidden'], 403);
        }

        $message = ChatMessage::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        return response()->json($message->load('meeting'), 201);
    }

    public function show(Request $request, ChatMessage $chatMessage): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le message appartient à un meeting de l'utilisateur
        $chatMessage->load('meeting');
        if (!$chatMessage->meeting || $chatMessage->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($chatMessage);
    }

    public function update(Request $request, ChatMessage $chatMessage): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le message appartient à un meeting de l'utilisateur
        $chatMessage->load('meeting');
        if (!$chatMessage->meeting || $chatMessage->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'role' => ['sometimes', 'in:user,assistant,system'],
            'content' => ['sometimes', 'string'],
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        // Ne pas permettre de changer meeting_id
        unset($data['meeting_id']);

        $chatMessage->update($data);

        return response()->json($chatMessage->load('meeting'));
    }

    public function destroy(Request $request, ChatMessage $chatMessage): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le message appartient à un meeting de l'utilisateur
        $chatMessage->load('meeting');
        if (!$chatMessage->meeting || $chatMessage->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $chatMessage->delete();

        return response()->json(null, 204);
    }
}

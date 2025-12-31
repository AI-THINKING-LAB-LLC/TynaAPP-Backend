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
        $perPage = (int) $request->get('per_page', 15);

        return response()->json(
            ChatMessage::query()->with('meeting')->paginate($perPage)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'string'],
            'meeting_id' => ['required', 'string'],
            'role' => ['required', 'in:user,assistant,system'],
            'content' => ['required', 'string'],
            'created_at' => ['nullable', 'date'],
        ]);

        $message = ChatMessage::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        return response()->json($message->load('meeting'), 201);
    }

    public function show(ChatMessage $chatMessage): JsonResponse
    {
        return response()->json($chatMessage->load('meeting'));
    }

    public function update(Request $request, ChatMessage $chatMessage): JsonResponse
    {
        $data = $request->validate([
            'meeting_id' => ['sometimes', 'string'],
            'role' => ['sometimes', 'in:user,assistant,system'],
            'content' => ['sometimes', 'string'],
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $chatMessage->update($data);

        return response()->json($chatMessage->load('meeting'));
    }

    public function destroy(ChatMessage $chatMessage): JsonResponse
    {
        $chatMessage->delete();

        return response()->json(null, 204);
    }
}

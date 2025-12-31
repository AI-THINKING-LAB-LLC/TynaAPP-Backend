<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MeetingSummary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MeetingSummaryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;
        $perPage = (int) $request->get('per_page', 15);

        // Filtrer les résumés par meeting qui appartient à l'utilisateur
        $query = MeetingSummary::query()
            ->with('meeting')
            ->whereHas('meeting', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->orderBy('created_at', 'desc');

        return response()->json($query->paginate($perPage));
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
            'summary_text' => ['required', 'string'], // Matches Supabase
            'action_items' => ['nullable', 'array'],
            'user_notes' => ['nullable', 'string'], // Matches Supabase
            'created_at' => ['nullable', 'date'],
        ]);

        // Vérifier que le meeting appartient à l'utilisateur
        $meeting = \App\Models\Meeting::where('id', $data['meeting_id'])
            ->where('user_id', $userId)
            ->first();

        if (!$meeting) {
            return response()->json(['message' => 'Meeting not found or forbidden'], 403);
        }

        $summary = MeetingSummary::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        return response()->json($summary->load('meeting'), 201);
    }

    public function show(Request $request, MeetingSummary $meetingSummary): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le résumé appartient à un meeting de l'utilisateur
        $meetingSummary->load('meeting');
        if (!$meetingSummary->meeting || $meetingSummary->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($meetingSummary);
    }

    public function update(Request $request, MeetingSummary $meetingSummary): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le résumé appartient à un meeting de l'utilisateur
        $meetingSummary->load('meeting');
        if (!$meetingSummary->meeting || $meetingSummary->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'summary_text' => ['sometimes', 'string'], // Matches Supabase
            'action_items' => ['sometimes', 'nullable', 'array'],
            'user_notes' => ['sometimes', 'nullable', 'string'], // Matches Supabase
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        // Ne pas permettre de changer meeting_id
        unset($data['meeting_id']);

        $meetingSummary->update($data);

        return response()->json($meetingSummary->load('meeting'));
    }

    public function destroy(Request $request, MeetingSummary $meetingSummary): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $userId = (string) $user->id;

        // Vérifier que le résumé appartient à un meeting de l'utilisateur
        $meetingSummary->load('meeting');
        if (!$meetingSummary->meeting || $meetingSummary->meeting->user_id !== $userId) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $meetingSummary->delete();

        return response()->json(null, 204);
    }
}

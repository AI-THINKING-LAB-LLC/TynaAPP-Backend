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
        $perPage = (int) $request->get('per_page', 15);

        return response()->json(
            MeetingSummary::query()->with('meeting')->paginate($perPage)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'string'],
            'meeting_id' => ['required', 'string'],
            'summary' => ['required', 'string'],
            'action_items' => ['nullable', 'array'],
            'created_at' => ['nullable', 'date'],
        ]);

        $summary = MeetingSummary::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        return response()->json($summary->load('meeting'), 201);
    }

    public function show(MeetingSummary $meetingSummary): JsonResponse
    {
        return response()->json($meetingSummary->load('meeting'));
    }

    public function update(Request $request, MeetingSummary $meetingSummary): JsonResponse
    {
        $data = $request->validate([
            'meeting_id' => ['sometimes', 'string'],
            'summary' => ['sometimes', 'string'],
            'action_items' => ['sometimes', 'nullable', 'array'],
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $meetingSummary->update($data);

        return response()->json($meetingSummary->load('meeting'));
    }

    public function destroy(MeetingSummary $meetingSummary): JsonResponse
    {
        $meetingSummary->delete();

        return response()->json(null, 204);
    }
}

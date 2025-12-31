<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MeetingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('per_page', 15);

        return response()->json(
            Meeting::query()->paginate($perPage)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'string'],
            'user_id' => ['required', 'string', 'exists:profiles,id'],
            'title' => ['required', 'string'],
            'status' => ['required', 'in:live,ended'],
            'started_at' => ['required', 'date'],
            'ended_at' => ['nullable', 'date', 'after_or_equal:started_at'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'created_at' => ['nullable', 'date'],
        ]);

        $meeting = Meeting::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        return response()->json($meeting, 201);
    }

    public function show(Meeting $meeting): JsonResponse
    {
        return response()->json($meeting);
    }

    public function update(Request $request, Meeting $meeting): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['sometimes', 'string', 'exists:profiles,id'],
            'title' => ['sometimes', 'string'],
            'status' => ['sometimes', 'in:live,ended'],
            'started_at' => ['sometimes', 'date'],
            'ended_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:started_at'],
            'duration_seconds' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $meeting->update($data);

        return response()->json($meeting);
    }

    public function destroy(Meeting $meeting): JsonResponse
    {
        $meeting->delete();

        return response()->json(null, 204);
    }
}

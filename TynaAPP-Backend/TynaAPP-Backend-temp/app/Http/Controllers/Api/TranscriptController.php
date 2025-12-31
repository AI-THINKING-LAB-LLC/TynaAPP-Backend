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
        $perPage = (int) $request->get('per_page', 15);

        return response()->json(
            Transcript::query()->with('meeting')->paginate($perPage)
        );
    }

    public function store(Request $request): JsonResponse
    {
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

        $transcript = Transcript::create([
            'id' => $data['id'] ?? (string) Str::uuid(),
            ...$data,
        ]);

        return response()->json($transcript->load('meeting'), 201);
    }

    public function show(Transcript $transcript): JsonResponse
    {
        return response()->json($transcript->load('meeting'));
    }

    public function update(Request $request, Transcript $transcript): JsonResponse
    {
        $data = $request->validate([
            'meeting_id' => ['sometimes', 'string'],
            'speaker' => ['sometimes', 'string'],
            'text' => ['sometimes', 'string'],
            'timestamp' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'language_code' => ['sometimes', 'nullable', 'string', 'max:10'],
            'confidence' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:1'],
            'created_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $transcript->update($data);

        return response()->json($transcript->load('meeting'));
    }

    public function destroy(Transcript $transcript): JsonResponse
    {
        $transcript->delete();

        return response()->json(null, 204);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\ChatMessage;
use App\Models\MeetingSummary;
use App\Models\Transcript;

class Meeting extends Model
{
    use HasFactory;

    protected $table = 'meetings';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $fillable = [
        'id',
        'user_id',
        'title',
        'status',
        'started_at',
        'ended_at',
        'duration_seconds',
        'created_at',
    ];
    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'created_at' => 'datetime',
        'duration_seconds' => 'integer',
    ];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'user_id', 'id');
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'meeting_id', 'id');
    }

    public function summary(): HasOne
    {
        return $this->hasOne(MeetingSummary::class, 'meeting_id', 'id');
    }

    public function transcripts(): HasMany
    {
        return $this->hasMany(Transcript::class, 'meeting_id', 'id');
    }
}

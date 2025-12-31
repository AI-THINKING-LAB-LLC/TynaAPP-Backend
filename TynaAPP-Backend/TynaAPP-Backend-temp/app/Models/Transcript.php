<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transcript extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $table = 'transcripts';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'meeting_id',
        'speaker',
        'text',
        'timestamp',
        'language_code',
        'confidence',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'confidence' => 'float',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'meeting_id', 'id');
    }
}

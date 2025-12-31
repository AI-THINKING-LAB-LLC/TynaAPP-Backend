<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'validation_subject',
        'validation_body',
        'welcome_subject',
        'welcome_body',
        'subscription_subject',
        'subscription_body',
    ];
}

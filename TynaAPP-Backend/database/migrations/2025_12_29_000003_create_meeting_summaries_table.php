<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('meeting_summaries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('meeting_id')->unique();
            $table->text('summary_text')->default(''); // Matches Supabase schema
            $table->json('action_items')->default('[]');
            $table->text('user_notes')->default(''); // Matches Supabase schema
            $table->timestampTz('created_at')->useCurrent();
            $table->foreign('meeting_id')->references('id')->on('meetings')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meeting_summaries');
    }
};

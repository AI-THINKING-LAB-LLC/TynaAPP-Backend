<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Update meeting_summaries to match Supabase schema (summary_text and user_notes)
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Check if summary_text column exists, if not add it
            $hasSummaryText = DB::selectOne("
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'meeting_summaries' 
                    AND column_name = 'summary_text'
                ) as exists
            ");

            if (!$hasSummaryText->exists) {
                // If 'summary' column exists, migrate data and rename
                $hasSummary = DB::selectOne("
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'meeting_summaries' 
                        AND column_name = 'summary'
                    ) as exists
                ");

                if ($hasSummary->exists) {
                    // Migrate data from summary to summary_text
                    DB::statement("ALTER TABLE meeting_summaries ADD COLUMN summary_text TEXT DEFAULT ''");
                    DB::statement("UPDATE meeting_summaries SET summary_text = summary WHERE summary IS NOT NULL");
                    DB::statement("ALTER TABLE meeting_summaries DROP COLUMN summary");
                } else {
                    // Just add the new column
                    DB::statement("ALTER TABLE meeting_summaries ADD COLUMN summary_text TEXT DEFAULT ''");
                }
            }

            // Add user_notes if it doesn't exist
            $hasUserNotes = DB::selectOne("
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'meeting_summaries' 
                    AND column_name = 'user_notes'
                ) as exists
            ");

            if (!$hasUserNotes->exists) {
                DB::statement("ALTER TABLE meeting_summaries ADD COLUMN user_notes TEXT DEFAULT ''");
            }
        } else {
            // For other databases, use Schema
            Schema::table('meeting_summaries', function (Blueprint $table) {
                if (!Schema::hasColumn('meeting_summaries', 'summary_text')) {
                    if (Schema::hasColumn('meeting_summaries', 'summary')) {
                        $table->text('summary_text')->default('')->after('meeting_id');
                        DB::statement('UPDATE meeting_summaries SET summary_text = summary');
                        $table->dropColumn('summary');
                    } else {
                        $table->text('summary_text')->default('')->after('meeting_id');
                    }
                }
                
                if (!Schema::hasColumn('meeting_summaries', 'user_notes')) {
                    $table->text('user_notes')->default('')->after('action_items');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Revert: rename summary_text back to summary if needed
            $hasSummaryText = DB::selectOne("
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'meeting_summaries' 
                    AND column_name = 'summary_text'
                ) as exists
            ");

            if ($hasSummaryText->exists) {
                DB::statement("ALTER TABLE meeting_summaries ADD COLUMN summary TEXT");
                DB::statement("UPDATE meeting_summaries SET summary = summary_text WHERE summary_text IS NOT NULL");
                DB::statement("ALTER TABLE meeting_summaries DROP COLUMN summary_text");
            }

            // Drop user_notes
            DB::statement("ALTER TABLE meeting_summaries DROP COLUMN IF EXISTS user_notes");
        } else {
            Schema::table('meeting_summaries', function (Blueprint $table) {
                if (Schema::hasColumn('meeting_summaries', 'summary_text')) {
                    $table->text('summary')->after('meeting_id');
                    DB::statement('UPDATE meeting_summaries SET summary = summary_text');
                    $table->dropColumn('summary_text');
                }
                $table->dropColumn('user_notes');
            });
        }
    }
};


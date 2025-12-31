<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For MySQL/MariaDB: Modify enum to include 'scheduled'
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE meetings MODIFY COLUMN status ENUM('live', 'ended', 'scheduled') DEFAULT 'live'");
        }
        
        // For PostgreSQL: Drop and recreate constraint
        if (DB::getDriverName() === 'pgsql') {
            // Drop old constraint if it exists
            DB::statement("ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check");
            // Add new constraint with 'scheduled' included
            DB::statement("ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('live', 'ended', 'scheduled'))");
            // Ensure default is set
            DB::statement("ALTER TABLE meetings ALTER COLUMN status SET DEFAULT 'live'");
        }
        
        // For SQLite: SQLite doesn't support ALTER COLUMN for enum, so we'll use a check constraint
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't have native enum, so we just need to ensure the constraint allows 'scheduled'
            // The application-level validation will handle this
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original enum values
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE meetings MODIFY COLUMN status ENUM('live', 'ended') DEFAULT 'live'");
        }
        
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check");
            DB::statement("ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('live', 'ended'))");
        }
    }
};


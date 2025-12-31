<?php
/**
 * Quick fix script to verify and ensure plans table has quota and minutes columns
 * Run this with: php fix-plans-schema.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "🔍 Checking plans table schema...\n";

try {
    // Check if columns exist using raw SQL
    $columns = DB::select("PRAGMA table_info(plans)");
    
    echo "📋 Current columns in plans table:\n";
    $columnNames = [];
    foreach ($columns as $column) {
        $name = is_object($column) ? $column->name : $column['name'];
        echo "   - $name\n";
        $columnNames[] = $name;
    }
    
    $hasQuota = in_array('quota', $columnNames);
    $hasMinutes = in_array('minutes', $columnNames);
    
    if (!$hasQuota || !$hasMinutes) {
        echo "\n❌ Missing columns detected!\n";
        
        if (!$hasQuota) {
            echo "   Adding 'quota' column...\n";
            DB::statement('ALTER TABLE plans ADD COLUMN quota INTEGER NULL');
        }
        
        if (!$hasMinutes) {
            echo "   Adding 'minutes' column...\n";
            DB::statement('ALTER TABLE plans ADD COLUMN minutes INTEGER NULL');
        }
        
        echo "✅ Columns added successfully!\n";
    } else {
        echo "\n✅ All required columns exist!\n";
    }
    
    // Verify the columns are accessible
    echo "\n🔍 Verifying column access...\n";
    $test = DB::table('plans')->first();
    if ($test) {
        echo "✅ Can read from plans table\n";
        if (isset($test->quota) || property_exists($test, 'quota')) {
            echo "✅ 'quota' column is accessible\n";
        } else {
            echo "⚠️  'quota' column not accessible (may need cache clear)\n";
        }
        if (isset($test->minutes) || property_exists($test, 'minutes')) {
            echo "✅ 'minutes' column is accessible\n";
        } else {
            echo "⚠️  'minutes' column not accessible (may need cache clear)\n";
        }
    }
    
    echo "\n💡 Please restart your Laravel server for changes to take effect.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

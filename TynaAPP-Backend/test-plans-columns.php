<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Testing plans table columns...\n\n";

try {
    // Test 1: Direct SQL query
    echo "1. Direct SQL query:\n";
    $result = DB::select("SELECT id, name, quota, minutes FROM plans WHERE id = 1");
    if ($result) {
        $plan = $result[0];
        echo "   ✅ Can read quota: " . ($plan->quota ?? 'NULL') . "\n";
        echo "   ✅ Can read minutes: " . ($plan->minutes ?? 'NULL') . "\n";
    }
    
    // Test 2: Using Eloquent
    echo "\n2. Using Eloquent Model:\n";
    $plan = \App\Models\Plan::find(1);
    if ($plan) {
        echo "   ✅ Model found\n";
        echo "   quota attribute: " . (isset($plan->quota) ? $plan->quota : 'NOT SET') . "\n";
        echo "   minutes attribute: " . (isset($plan->minutes) ? $plan->minutes : 'NOT SET') . "\n";
        
        // Try to set and save
        echo "\n3. Testing update:\n";
        $plan->quota = 10;
        $plan->minutes = 300;
        try {
            $plan->save();
            echo "   ✅ Update successful!\n";
        } catch (\Exception $e) {
            echo "   ❌ Update failed: " . $e->getMessage() . "\n";
        }
    }
    
    // Test 3: Check schema
    echo "\n4. Schema check:\n";
    $columns = DB::select("PRAGMA table_info(plans)");
    $hasQuota = false;
    $hasMinutes = false;
    foreach ($columns as $col) {
        if ($col->name === 'quota') $hasQuota = true;
        if ($col->name === 'minutes') $hasMinutes = true;
    }
    echo "   quota column exists: " . ($hasQuota ? 'YES' : 'NO') . "\n";
    echo "   minutes column exists: " . ($hasMinutes ? 'YES' : 'NO') . "\n";
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}


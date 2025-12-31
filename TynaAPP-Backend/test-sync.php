<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "🔄 Test de synchronisation Supabase → Laravel\n";
echo str_repeat("=", 50) . "\n\n";

$service = app('App\Services\SupabaseService');

// 1. Test connexion
echo "1️⃣ Test connexion Supabase...\n";
try {
    $test = $service->request('GET', 'profiles?select=count&limit=1');
    echo "   ✅ Connexion OK\n\n";
} catch (Exception $e) {
    echo "   ❌ Erreur: " . $e->getMessage() . "\n\n";
    exit(1);
}

// 2. Récupérer tous les profiles
echo "2️⃣ Récupération des profiles...\n";
try {
    $profiles = $service->request('GET', 'profiles?select=*&order=created_at.desc');
    echo "   📊 Profiles trouvés: " . count($profiles) . "\n";
    if (count($profiles) > 0) {
        foreach (array_slice($profiles, 0, 3) as $p) {
            echo "      - " . ($p['email'] ?? 'N/A') . " (" . ($p['id'] ?? 'N/A') . ")\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Erreur: " . $e->getMessage() . "\n\n";
}

// 3. Récupérer tous les meetings
echo "3️⃣ Récupération des meetings...\n";
try {
    $meetings = $service->request('GET', 'meetings?select=id,title,user_id&order=started_at.desc&limit=10');
    echo "   📊 Meetings trouvés: " . count($meetings) . "\n";
    if (count($meetings) > 0) {
        foreach (array_slice($meetings, 0, 3) as $m) {
            echo "      - " . ($m['title'] ?? 'N/A') . " (user: " . ($m['user_id'] ?? 'N/A') . ")\n";
        }
    }
    echo "\n";
} catch (Exception $e) {
    echo "   ❌ Erreur: " . $e->getMessage() . "\n\n";
}

// 4. Synchroniser toutes les données
echo "4️⃣ Synchronisation complète...\n";
try {
    $controller = app('App\Http\Controllers\Api\SupabaseSyncController');
    $response = $controller->syncAll();
    $data = json_decode($response->getContent(), true);
    
    if ($data['success']) {
        echo "   ✅ Synchronisation réussie!\n";
        echo "   📊 Statistiques:\n";
        foreach ($data['stats'] as $type => $count) {
            echo "      - $type: $count\n";
        }
    } else {
        echo "   ❌ Erreur: " . ($data['message'] ?? 'Unknown error') . "\n";
    }
} catch (Exception $e) {
    echo "   ❌ Erreur: " . $e->getMessage() . "\n";
    echo "   Trace: " . $e->getTraceAsString() . "\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
echo "✅ Test terminé\n";


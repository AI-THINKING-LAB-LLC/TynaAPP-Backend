<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PlanAssignmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AssignStarterPlanToExistingUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'plans:assign-starter-to-existing-users 
                            {--dry-run : Afficher les utilisateurs qui recevront le plan sans l\'attribuer réellement}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Attribue le plan Starter (gratuit) à tous les utilisateurs existants qui n\'ont pas de plan actif';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔍 Recherche des utilisateurs sans plan actif...');

        // Trouver tous les utilisateurs qui n'ont pas de subscription active
        // Utiliser une requête directe car Laravel Cashier peut avoir des contraintes spécifiques
        $usersWithActivePlans = DB::table('subscriptions')
            ->where('type', 'default')
            ->where('stripe_status', 'active')
            ->where(function ($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->pluck('user_id')
            ->unique();

        $usersWithoutPlan = User::whereNotIn('id', $usersWithActivePlans)->get();

        if ($usersWithoutPlan->isEmpty()) {
            $this->info('✅ Tous les utilisateurs ont déjà un plan actif.');
            return Command::SUCCESS;
        }

        $this->info("📊 Trouvé {$usersWithoutPlan->count()} utilisateur(s) sans plan actif.");

        if ($this->option('dry-run')) {
            $this->warn('🔍 Mode dry-run - Aucun plan ne sera attribué');
            $this->table(
                ['ID', 'Nom', 'Email'],
                $usersWithoutPlan->map(fn($user) => [
                    $user->id,
                    $user->name,
                    $user->email,
                ])->toArray()
            );
            $this->info("\n💡 Pour attribuer réellement les plans, exécutez la commande sans --dry-run");
            return Command::SUCCESS;
        }

        $this->info("\n🚀 Attribution du plan Starter aux utilisateurs...");

        $bar = $this->output->createProgressBar($usersWithoutPlan->count());
        $bar->start();

        $successCount = 0;
        $failedCount = 0;

        foreach ($usersWithoutPlan as $user) {
            if (PlanAssignmentService::assignStarterPlan($user)) {
                $successCount++;
            } else {
                $failedCount++;
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->info("✅ {$successCount} utilisateur(s) ont reçu le plan Starter.");
        
        if ($failedCount > 0) {
            $this->warn("⚠️  {$failedCount} utilisateur(s) n'ont pas pu recevoir le plan (voir les logs pour plus de détails).");
        }

        return Command::SUCCESS;
    }
}


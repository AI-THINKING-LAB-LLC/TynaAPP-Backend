<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PlanAssignmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:create-admin-user 
                            {--email=admin@admin.com : Email address for admin user}
                            {--password=password : Password for admin user}
                            {--name=Admin : Name for admin user}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create or update admin user account';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->option('email');
        $password = $this->option('password');
        $name = $this->option('name');

        // Check if user already exists
        $user = User::where('email', $email)->first();

        if ($user) {
            // Update existing user
            $user->update([
                'name' => $name,
                'password' => Hash::make($password),
            ]);
            $this->info("✅ Admin user updated: {$email}");
        } else {
            // Create new user
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]);
            $this->info("✅ Admin user created: {$email}");
        }

        // Assign Starter plan if not already assigned
        PlanAssignmentService::assignStarterPlan($user);

        $this->info("📧 Email: {$email}");
        $this->info("🔑 Password: {$password}");
        $this->info("👤 Name: {$name}");

        return Command::SUCCESS;
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_settings', function (Blueprint $table) {
            $table->id();
            $table->string('validation_subject')->default('Validez votre compte');
            $table->text('validation_body')->nullable();
            $table->string('welcome_subject')->default('Bienvenue !');
            $table->text('welcome_body')->nullable();
            $table->string('subscription_subject')->default('Subscription confirmée');
            $table->text('subscription_body')->nullable();
            $table->timestampsTz();
        });

        DB::table('email_settings')->insert([
            'validation_subject' => 'Validez votre compte',
            'welcome_subject' => 'Bienvenue !',
            'subscription_subject' => 'Subscription confirmée',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('email_settings');
    }
};

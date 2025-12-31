<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('stripe_product_id');
            $table->string('stripe_price_id')->unique();
            $table->string('interval')->default('month');
            $table->unsignedInteger('amount')->nullable();
            $table->string('currency', 3)->default('usd');
            $table->unsignedInteger('trial_days')->nullable();
            $table->boolean('active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['active', 'interval']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};

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
        Schema::create('backups_log', function (Blueprint $table) {
        $table->id();
        $table->enum('type', ['full', 'incremental']);
        $table->string('file_path');
        $table->enum('status', ['success', 'failed']);
        $table->text('notes')->nullable();
        $table->timestamp('created_at')->useCurrent();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('backups_log');
    }
};

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupLog extends Model
{
    public $timestamps = false;

    protected $table = 'backups_log';

    protected $fillable = [
        'type',
        'file_path',
        'status',
        'notes',
        'created_at',
    ];
}
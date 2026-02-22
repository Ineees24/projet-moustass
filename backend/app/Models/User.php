<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
<<<<<<< HEAD
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'email',
        'password_hash',
        'role',
        'status',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];
}
=======
use Laravel\Sanctum\HasApiTokens; // ← CETTE LIGNE EST IMPORTANTE !

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens; // ← HasApiTokens doit être là !

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'client_secret_hash'
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'client_secret_hash'
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126

<?php

<<<<<<< HEAD
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\MessageController;


Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Liste des utilisateurs (pour le sélecteur de destinataire côté client)
    Route::get('/users', [AdminController::class, 'index']);
    Route::get('/users/recipients', [MessageController::class, 'recipients']);

    // Messages vocaux
    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    // Liste des utilisateurs
    Route::get('/admin/users', [AdminController::class, 'index']);

    // Créer un utilisateur
    Route::post('/admin/users', [AdminController::class, 'store']);

    // Modifier un utilisateur
    Route::put('/admin/users/{id}', [AdminController::class, 'update']);
    Route::patch('/admin/users/{id}', [AdminController::class, 'update']);

    // Supprimer un utilisateur
    Route::delete('/admin/users/{id}', [AdminController::class, 'destroy']);

    // Actions spéciales
    Route::patch('/admin/users/{id}/disable', [AdminController::class, 'disable']);
    Route::patch('/admin/users/{id}/enable', [AdminController::class, 'enable']);
=======
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController; // AJOUTÉ

// Route de test (publique)
Route::get('/health', function () {
    return response()->json([
        'status' => 'OK',
        'timestamp' => now(),
        'service' => 'Moustass Auth API'
    ]);
});

// Routes d'authentification (publiques)
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    
    // Routes protégées (nécessitent un token)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// Routes Utilisateurs (protégées - liste des destinataires)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
});

// Routes Admin (protégées) -- ADMINCONTROLLER ASK INES
Route::prefix('admin')->middleware(['auth:sanctum', 'role:ADMIN'])->group(function () {
    Route::get('/users', [AdminController::class, 'index']);
    Route::post('/users', [AdminController::class, 'store']);
    Route::get('/users/{id}', [AdminController::class, 'show']);
    Route::put('/users/{id}', [AdminController::class, 'update']);
    Route::delete('/users/{id}', [AdminController::class, 'destroy']);
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126
});
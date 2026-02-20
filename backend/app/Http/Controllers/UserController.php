<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Liste des utilisateurs (pour sélectionner un destinataire)
     * GET /users
     */
    public function index(Request $request)
    {
        // Récupérer l'utilisateur connecté
        $currentUser = $request->user();

        // Lister tous les utilisateurs actifs SAUF soi-même
        $users = User::where('status', 'active')
                    ->where('id', '!=', $currentUser->id)
                    ->select('id', 'name', 'email', 'role') // Seulement les infos publiques
                    ->get();

        return response()->json([
            'users' => $users,
            'count' => $users->count()
        ], 200);
    }

    /**
     * Voir le profil d'un utilisateur spécifique
     * GET /users/{id}
     */
    public function show($id)
    {
        $user = User::where('status', 'active')
                   ->where('id', $id)
                   ->select('id', 'name', 'email', 'role')
                   ->first();

        if (!$user) {
            return response()->json([
                'message' => 'Utilisateur introuvable ou inactif'
            ], 404);
        }

        return response()->json([
            'user' => $user
        ], 200);
    }
}
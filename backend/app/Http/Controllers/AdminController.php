<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    // GET /admin/users
    public function index()
    {
        return response()->json(
            User::select('id', 'email', 'role', 'status', 'created_at')->get()
        );
    }

    // POST /admin/users   creer un utilisateur 
    public function store(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:12',
            'role' => 'required|in:ADMIN,CLIENT',
        ]);


        $user = User::create([
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'role' => $request->role,
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Utilisateur créé avec succès',
            'user' => $user
        ], 201);
    }

    // PUT/PATCH /admin/users/{id}   modifier un utilisateur 
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'email' => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($user->id)
            ],
            'password' => 'nullable|string|min:12',
            'role' => 'required|in:ADMIN,CLIENT',
            'status' => 'required|in:active,disabled',
        ]);

        $user->email = $request->email;
        $user->role = $request->role;
        $user->status = $request->status;

        // Mettre à jour le mot de passe seulement s'il est fourni
        if ($request->filled('password')) {
            $user->password_hash = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'message' => 'Utilisateur modifié avec succès',
            'user' => $user
        ]);
    }

    // DELETE /admin/users/{id}
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        
        // Empêcher la suppression de son propre compte
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas supprimer votre propre compte'
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'Utilisateur supprimé avec succès'
        ]);
    }

    // PATCH /admin/users/{id}/disable 
    public function disable($id)
    {
        $user = User::findOrFail($id);
        $user->status = 'disabled';
        $user->save();

        return response()->json([
            'message' => 'Utilisateur désactivé avec succès'
        ]);
    }

    // PATCH /admin/users/{id}/enable 
    public function enable($id)
    {
        $user = User::findOrFail($id);
        $user->status = 'active';
        $user->save();

        return response()->json([
            'message' => 'Utilisateur activé avec succès'
        ]);
    }
}

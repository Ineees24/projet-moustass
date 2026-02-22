<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
<<<<<<< HEAD
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
=======
use Illuminate\Validation\Rules\Password;

class AdminController extends Controller
{
    /**
     * Liste tous les utilisateurs (GET /admin/users)
     */
    public function index()
    {
        $users = User::all();
        return response()->json($users, 200);
    }

    /**
     * Créer un utilisateur (POST /admin/users)
     */
    public function store(Request $request)
    {
        // Validation des données
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => [
                'required',
                Password::min($request->role === 'ADMIN' ? 15 : 12)
                    ->mixedCase()
                    ->numbers()
                    ->symbols()
            ],
            'role' => 'required|in:ADMIN,CLIENT'
        ]);

        // Créer l'utilisateur
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'status' => 'active'
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126
        ]);

        return response()->json([
            'message' => 'Utilisateur créé avec succès',
            'user' => $user
        ], 201);
    }

<<<<<<< HEAD
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
=======
    /**
     * Afficher un utilisateur spécifique (GET /admin/users/{id})
     */
    public function show($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Utilisateur introuvable'], 404);
        }

        return response()->json($user, 200);
    }

    /**
     * Mettre à jour un utilisateur (PUT /admin/users/{id})
     */
    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Utilisateur introuvable'], 404);
        }

        // Validation
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'role' => 'sometimes|in:ADMIN,CLIENT',
            'status' => 'sometimes|in:active,disabled'
        ]);

        // Mise à jour
        $user->update($validated);

        return response()->json([
            'message' => 'Utilisateur mis à jour',
            'user' => $user
        ], 200);
    }

    /**
     * Supprimer un utilisateur (DELETE /admin/users/{id})
     */
    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Utilisateur introuvable'], 404);
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126
        }

        $user->delete();

        return response()->json([
<<<<<<< HEAD
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
=======
            'message' => 'Utilisateur supprimé'
        ], 200);
    }
}
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126

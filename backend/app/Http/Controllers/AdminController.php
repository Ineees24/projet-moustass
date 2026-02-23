<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use OpenApi\Attributes as OA;

class AdminController extends Controller
{
    #[OA\Get(
        path: "/admin/users",
        summary: "Liste tous les utilisateurs",
        tags: ["Admin"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Liste des utilisateurs"),
            new OA\Response(response: 401, description: "Non authentifié"),
            new OA\Response(response: 403, description: "Accès refusé")
        ]
    )]
    public function index()
    {
        return response()->json(
            User::select('id', 'email', 'role', 'status', 'created_at')->get()
        );
    }

    #[OA\Post(
        path: "/admin/users",
        summary: "Créer un nouvel utilisateur",
        tags: ["Admin"],
        security: [["bearerAuth" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "password", "role"],
                properties: [
                    new OA\Property(property: "email", type: "string", example: "bob@moustass.com"),
                    new OA\Property(property: "password", type: "string", example: "MonMotDePasse1!"),
                    new OA\Property(property: "role", type: "string", enum: ["ADMIN", "CLIENT"], example: "CLIENT")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Utilisateur créé avec succès"),
            new OA\Response(response: 400, description: "Données invalides"),
            new OA\Response(response: 403, description: "Accès refusé")
        ]
    )]
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

    #[OA\Put(
        path: "/admin/users/{id}",
        summary: "Modifier un utilisateur",
        tags: ["Admin"],
        security: [["bearerAuth" => []]],
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "role", "status"],
                properties: [
                    new OA\Property(property: "email", type: "string", example: "bob@moustass.com"),
                    new OA\Property(property: "password", type: "string", example: "NouveauMotDePasse1!"),
                    new OA\Property(property: "role", type: "string", enum: ["ADMIN", "CLIENT"]),
                    new OA\Property(property: "status", type: "string", enum: ["active", "disabled"])
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Utilisateur modifié avec succès"),
            new OA\Response(response: 404, description: "Utilisateur introuvable"),
            new OA\Response(response: 403, description: "Accès refusé")
        ]
    )]
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:12',
            'role' => 'required|in:ADMIN,CLIENT',
            'status' => 'required|in:active,disabled',
        ]);

        $user->email = $request->email;
        $user->role = $request->role;
        $user->status = $request->status;

        if ($request->filled('password')) {
            $user->password_hash = Hash::make($request->password);
        }

        $user->save();

        return response()->json([
            'message' => 'Utilisateur modifié avec succès',
            'user' => $user
        ]);
    }

    #[OA\Delete(
        path: "/admin/users/{id}",
        summary: "Supprimer un utilisateur",
        tags: ["Admin"],
        security: [["bearerAuth" => []]],
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))
        ],
        responses: [
            new OA\Response(response: 200, description: "Utilisateur supprimé avec succès"),
            new OA\Response(response: 403, description: "Action non autorisée"),
            new OA\Response(response: 404, description: "Utilisateur introuvable")
        ]
    )]
    public function destroy($id)
    {
        $user = User::findOrFail($id);

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

    #[OA\Patch(
        path: "/admin/users/{id}/disable",
        summary: "Désactiver un utilisateur",
        tags: ["Admin"],
        security: [["bearerAuth" => []]],
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))
        ],
        responses: [
            new OA\Response(response: 200, description: "Utilisateur désactivé avec succès"),
            new OA\Response(response: 404, description: "Utilisateur introuvable")
        ]
    )]
    public function disable($id)
    {
        $user = User::findOrFail($id);
        $user->status = 'disabled';
        $user->save();

        return response()->json([
            'message' => 'Utilisateur désactivé avec succès'
        ]);
    }

    #[OA\Patch(
        path: "/admin/users/{id}/enable",
        summary: "Activer un utilisateur",
        tags: ["Admin"],
        security: [["bearerAuth" => []]],
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))
        ],
        responses: [
            new OA\Response(response: 200, description: "Utilisateur activé avec succès"),
            new OA\Response(response: 404, description: "Utilisateur introuvable")
        ]
    )]
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
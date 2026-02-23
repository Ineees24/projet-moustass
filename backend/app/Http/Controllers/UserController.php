<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class UserController extends Controller
{
    #[OA\Get(
        path: "/users",
        summary: "Liste des utilisateurs actifs",
        tags: ["Utilisateurs"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Liste des utilisateurs actifs"),
            new OA\Response(response: 401, description: "Non authentifié")
        ]
    )]
    public function index(Request $request)
    {
        $currentUser = $request->user();

        $users = User::where('status', 'active')
                    ->where('id', '!=', $currentUser->id)
                    ->select('id', 'name', 'email', 'role')
                    ->get();

        return response()->json([
            'users' => $users,
            'count' => $users->count()
        ], 200);
    }

    #[OA\Get(
        path: "/users/{id}",
        summary: "Voir le profil d'un utilisateur",
        tags: ["Utilisateurs"],
        security: [["bearerAuth" => []]],
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))
        ],
        responses: [
            new OA\Response(response: 200, description: "Profil de l'utilisateur"),
            new OA\Response(response: 404, description: "Utilisateur introuvable"),
            new OA\Response(response: 401, description: "Non authentifié")
        ]
    )]
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
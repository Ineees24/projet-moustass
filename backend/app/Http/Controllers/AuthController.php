<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

#[OA\Info(title: "Moustass API", version: "1.0.0", description: "API sécurisée pour l'application Moustass")]
#[OA\SecurityScheme(securityScheme: "bearerAuth", type: "http", scheme: "bearer", bearerFormat: "JWT")]
#[OA\Server(url: "https://www.moustass.com/api", description: "Serveur local")]
class AuthController extends Controller
{
    #[OA\Post(
        path: "/auth/register",
        summary: "Inscription d'un nouvel utilisateur",
        tags: ["Authentification"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "password"],
                properties: [
                    new OA\Property(property: "email", type: "string", example: "alice@moustass.com"),
                    new OA\Property(property: "password", type: "string", example: "MonMotDePasse1!")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Utilisateur créé avec succès"),
            new OA\Response(response: 400, description: "Données invalides")
        ]
    )]
    public function register(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => [
                'required', 'string', 'min:12',
                'regex:/[A-Z]/', 'regex:/[a-z]/',
                'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/',
            ],
        ]);

        $user = User::create([
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'role' => 'CLIENT',
            'status' => 'active',
        ]);

        return response()->json(['message' => 'User registered successfully'], 201);
    }

    #[OA\Post(
        path: "/auth/login",
        summary: "Connexion utilisateur",
        tags: ["Authentification"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "password"],
                properties: [
                    new OA\Property(property: "email", type: "string", example: "alice@moustass.com"),
                    new OA\Property(property: "password", type: "string", example: "MonMotDePasse1!")
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Connexion réussie"),
            new OA\Response(response: 401, description: "Identifiants invalides"),
            new OA\Response(response: 403, description: "Compte désactivé")
        ]
    )]
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Account disabled'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    #[OA\Get(
        path: "/auth/me",
        summary: "Récupérer les infos de l'utilisateur connecté",
        tags: ["Authentification"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Informations utilisateur"),
            new OA\Response(response: 401, description: "Non authentifié")
        ]
    )]
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
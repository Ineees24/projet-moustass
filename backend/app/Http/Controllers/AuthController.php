<?php

namespace App\Http\Controllers;
<<<<<<< HEAD

=======
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{

    // POST /auth/register
    public function register(Request $request)
<<<<<<< HEAD
    {
        $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => [
                'required',
                'string',
                'min:12',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
            ],
        ]);

        $user = User::create([
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'role' => 'CLIENT',
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'User registered successfully',
        ], 201);
    }

    // POST /auth/login
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
            return response()->json([
                'message' => 'Account disabled',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

=======
{
    // Validation
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users,email',
        'password' => [
            'required',
            'confirmed', // Nécessite password_confirmation
            'string',
            'min:12',
            'regex:/[A-Z]/',      // Au moins 1 majuscule
            'regex:/[a-z]/',      // Au moins 1 minuscule
            'regex:/[0-9]/',      // Au moins 1 chiffre
            'regex:/[^A-Za-z0-9]/', // Au moins 1 caractère spécial
        ],
    ]);

    // Créer l'utilisateur
    $user = User::create([
        'name' => $validated['name'],
        'email' => $validated['email'],
        'password' => Hash::make($validated['password']), // 'password' pas 'password_hash'
        'role' => 'CLIENT',
        'status' => 'active',
    ]);

    // Créer un token d'authentification
    $token = $user->createToken('auth_token')->plainTextToken;

return response()->json([
    'message' => 'Inscription réussie',
    'user' => [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'role' => $user->role
    ],
    'token' => $token  // ← Cette ligne doit être présente !
], 201);
}

    // POST /auth/login
    public function login(Request $request)
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required|string',
    ]);

    $user = User::where('email', $request->email)->first();

    // CORRECTION ICI : 'password' au lieu de 'password_hash'
    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Email ou mot de passe incorrect'
        ], 401);
    }

    if ($user->status !== 'active') {
        return response()->json([
            'message' => 'Compte désactivé',
        ], 403);
    }

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Connexion réussie',
        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role
        ],
        'token' => $token
    ], 200);
}

>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126
    // GET /auth/me
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}

<<<<<<< HEAD

=======
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;




class AuthController extends Controller
{
    
    // POST /auth/register
    public function register(Request $request)
    {
        $request->validate([
            'nom'       => 'required|string|max:100',
            'prenom'    => 'required|string|max:100',
            'telephone' => 'required|string|max:20',
            'email'     => 'required|email|unique:users,email',
            'password'  => [
                'required', 'string', 'min:12',
                'regex:/[A-Z]/', 'regex:/[a-z]/',
                'regex:/[0-9]/', 'regex:/[^A-Za-z0-9]/',
            ],
        ]);

       

        $user = User::create([
            'nom'                => $request->nom,
            'prenom'             => $request->prenom,
            'telephone'          => $request->telephone,
            'email'              => $request->email,
            'password_hash'      => Hash::make($request->password),
            'role'               => 'CLIENT',
            'status'             => 'active',
            
        ]);

        return response()->json([
            'message'       => 'Compte créé avec succès',
            
        ], 201);
    }
    
    // POST /auth/login
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Compte désactivé'], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
        ]);
    }
    
    // GET /auth/me
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
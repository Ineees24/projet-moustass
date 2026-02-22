<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        // Vérifier que l'utilisateur est connecté
        if (!$request->user()) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        // Vérifier le rôle
        if ($request->user()->role !== $role) {
            return response()->json(['message' => 'Accès interdit'], 403);
        }

        return $next($request);
    }
}
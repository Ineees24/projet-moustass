<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
<<<<<<< HEAD
use App\Http\Middleware\AdminMiddleware;
=======
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
<<<<<<< HEAD
=======
        apiPrefix: 'api',
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
<<<<<<< HEAD
            'admin' => AdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
=======
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
        
        // Corriger le problème de redirection API
        $middleware->redirectGuestsTo(fn () => response()->json(['message' => 'Non authentifié'], 401));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
>>>>>>> f986177bbf45fb09eefb599d8cfbfa712757f126

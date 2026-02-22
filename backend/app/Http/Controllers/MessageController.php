<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    // GET /users/recipients — liste des autres clients (pour le sélecteur destinataire)
    public function recipients(Request $request)
    {
        $users = User::where('role', 'CLIENT')
            ->where('id', '!=', $request->user()->id)
            ->select('id', 'email', 'role')
            ->orderBy('email')
            ->get();

        return response()->json($users);
    }

    // GET /messages — messages reçus par l'utilisateur connecté
    public function index(Request $request)
    {
        $messages = Message::where('receiver_id', $request->user()->id)
            ->with('sender:id,email')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($msg) {
                return [
                    'id'               => $msg->id,
                    'sender_email'     => $msg->sender->email ?? 'Inconnu',
                    'created_at'       => $msg->created_at,
                    'duration_seconds' => $msg->duration_seconds,
                    'status'           => $msg->status,
                    'audio_url'        => $msg->file_path
                                            ? asset('storage/' . $msg->file_path)
                                            : null,
                ];
            });

        return response()->json($messages);
    }

    // POST /messages — envoyer un message vocal
    public function store(Request $request)
    {
        $request->validate([
            'audio'       => 'required|file|mimes:webm,ogg,mp4,wav|max:20480',
            'receiver_id' => 'required|exists:users,id',
        ]);

        $path = $request->file('audio')->store('messages', 'public');

        $message = Message::create([
            'sender_id'   => $request->user()->id,
            'receiver_id' => $request->receiver_id,
            'file_path'   => $path,
            'file_hash'   => hash_file('sha256', $request->file('audio')->getPathname()),
            'status'      => 'unread',
        ]);

        return response()->json([
            'message' => 'Message envoyé avec succès',
            'data'    => $message,
        ], 201);
    }
}
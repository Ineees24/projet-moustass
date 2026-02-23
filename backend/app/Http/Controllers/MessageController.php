<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class MessageController extends Controller
{
    #[OA\Get(
        path: "/users/recipients",
        summary: "Liste des destinataires disponibles",
        tags: ["Messages"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Liste des utilisateurs clients"),
            new OA\Response(response: 401, description: "Non authentifié")
        ]
    )]
    public function recipients(Request $request)
    {
        $users = User::where('role', 'CLIENT')
            ->where('id', '!=', $request->user()->id)
            ->select('id', 'email', 'role')
            ->orderBy('email')
            ->get();

        return response()->json($users);
    }

    #[OA\Get(
        path: "/messages",
        summary: "Liste des messages reçus",
        tags: ["Messages"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Liste des messages vocaux reçus"),
            new OA\Response(response: 401, description: "Non authentifié")
        ]
    )]
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

    #[OA\Post(
        path: "/messages",
        summary: "Envoyer un message vocal",
        tags: ["Messages"],
        security: [["bearerAuth" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: "multipart/form-data",
                schema: new OA\Schema(
                    required: ["audio", "receiver_id"],
                    properties: [
                        new OA\Property(property: "audio", type: "string", format: "binary"),
                        new OA\Property(property: "receiver_id", type: "integer", example: 2)
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "Message envoyé avec succès"),
            new OA\Response(response: 400, description: "Données invalides"),
            new OA\Response(response: 401, description: "Non authentifié")
        ]
    )]
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

    #[OA\Put(
        path: "/messages/{id}/read",
        summary: "Marquer un message comme lu",
        tags: ["Messages"],
        security: [["bearerAuth" => []]],
        parameters: [
            new OA\Parameter(name: "id", in: "path", required: true, schema: new OA\Schema(type: "integer"))
        ],
        responses: [
            new OA\Response(response: 200, description: "Message marqué comme lu"),
            new OA\Response(response: 404, description: "Message introuvable"),
            new OA\Response(response: 401, description: "Non authentifié")
        ]
    )]
    public function markAsRead(Request $request, $id)
    {
        $message = Message::where('id', $id)
            ->where('receiver_id', $request->user()->id)
            ->firstOrFail();

        $message->update(['status' => 'read']);

        return response()->json(['message' => 'Message marqué comme lu']);
    }
}
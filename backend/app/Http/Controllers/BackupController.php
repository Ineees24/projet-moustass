<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use App\Models\BackupLog;
use OpenApi\Attributes as OA;

class BackupController extends Controller
{
    private $backupPath;

    public function __construct()
    {
        $this->backupPath = storage_path('app/backups');
        if (!File::exists($this->backupPath)) {
            File::makeDirectory($this->backupPath, 0755, true);
        }
    }

    #[OA\Get(
        path: "/admin/backups/history",
        summary: "Historique des sauvegardes",
        tags: ["Backups"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 200, description: "Liste des sauvegardes"),
            new OA\Response(response: 401, description: "Non authentifié"),
            new OA\Response(response: 403, description: "Accès refusé")
        ]
    )]
    public function history()
    {
        $backups = BackupLog::orderBy('created_at', 'desc')->get();
        return response()->json([
            'backups' => $backups,
            'count' => $backups->count()
        ]);
    }

    #[OA\Post(
        path: "/admin/backups/full",
        summary: "Créer une sauvegarde complète",
        tags: ["Backups"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 201, description: "Backup complet créé avec succès"),
            new OA\Response(response: 500, description: "Erreur lors du backup"),
            new OA\Response(response: 403, description: "Accès refusé")
        ]
    )]
    public function full(Request $request)
    {
        try {
            $timestamp = now()->format('Y-m-d_H-i-s');
            $filename = "full_backup_{$timestamp}.sql";
            $filepath = $this->backupPath . '/' . $filename;

            $host = env('DB_HOST', '127.0.0.1');
            $database = env('DB_DATABASE', 'moustass');
            $username = env('DB_USERNAME', 'root');
            $password = env('DB_PASSWORD', '');

            $mysqldumpPath = 'C:\\wamp64\\bin\\mysql\\mysql8.0.31\\bin\\mysqldump';

            if (!file_exists($mysqldumpPath . '.exe')) {
                $mysqlDir = 'C:\\wamp64\\bin\\mysql\\';
                $versions = glob($mysqlDir . 'mysql*');
                if (!empty($versions)) {
                    $mysqldumpPath = $versions[0] . '\\bin\\mysqldump';
                }
            }

            $command = sprintf(
                '"%s" --host=%s --user=%s %s %s > "%s"',
                $mysqldumpPath, $host, $username,
                $password ? '--password=' . $password : '',
                $database, $filepath
            );

            exec($command . ' 2>&1', $output, $returnCode);

            if ($returnCode !== 0 || !file_exists($filepath)) {
                throw new \Exception('Erreur mysqldump : ' . implode("\n", $output));
            }

            $backup = BackupLog::create([
                'type' => 'full',
                'file_path' => $filepath,
                'status' => 'success',
                'notes' => 'Backup complet créé avec succès',
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Backup complet créé avec succès',
                'backup' => $backup,
                'file_size' => $this->formatBytes(filesize($filepath))
            ], 201);

        } catch (\Exception $e) {
            BackupLog::create([
                'type' => 'full',
                'file_path' => $filepath ?? null,
                'status' => 'failed',
                'notes' => 'Erreur: ' . $e->getMessage(),
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Erreur lors du backup',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    #[OA\Post(
        path: "/admin/backups/incremental",
        summary: "Créer une sauvegarde incrémentale",
        tags: ["Backups"],
        security: [["bearerAuth" => []]],
        responses: [
            new OA\Response(response: 201, description: "Backup incrémental créé avec succès"),
            new OA\Response(response: 400, description: "Aucun backup complet trouvé"),
            new OA\Response(response: 500, description: "Erreur lors du backup"),
            new OA\Response(response: 403, description: "Accès refusé")
        ]
    )]
    public function incremental(Request $request)
    {
        try {
            $lastBackup = BackupLog::where('status', 'success')
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$lastBackup) {
                return response()->json([
                    'message' => 'Aucun backup complet trouvé. Créez d\'abord un backup complet.',
                    'action' => 'POST /admin/backups/full'
                ], 400);
            }

            $timestamp = now()->format('Y-m-d_H-i-s');
            $filename = "incremental_backup_{$timestamp}.sql";
            $filepath = $this->backupPath . '/' . $filename;

            $this->exportIncrementalData($filepath, $lastBackup->created_at);

            $backup = BackupLog::create([
                'type' => 'incremental',
                'file_path' => $filepath,
                'status' => 'success',
                'notes' => "Backup incrémental depuis {$lastBackup->created_at}",
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Backup incrémental créé avec succès',
                'backup' => $backup,
                'since' => $lastBackup->created_at,
                'file_size' => $this->formatBytes(filesize($filepath))
            ], 201);

        } catch (\Exception $e) {
            BackupLog::create([
                'type' => 'incremental',
                'file_path' => $filepath ?? null,
                'status' => 'failed',
                'notes' => 'Erreur: ' . $e->getMessage(),
                'created_at' => now()
            ]);

            return response()->json([
                'message' => 'Erreur lors du backup incrémental',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    #[OA\Post(
        path: "/admin/backups/restore",
        summary: "Restaurer une sauvegarde",
        tags: ["Backups"],
        security: [["bearerAuth" => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["backup_id"],
                properties: [
                    new OA\Property(property: "backup_id", type: "integer", example: 1)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Base de données restaurée avec succès"),
            new OA\Response(response: 404, description: "Fichier de backup introuvable"),
            new OA\Response(response: 500, description: "Erreur lors de la restauration"),
            new OA\Response(response: 403, description: "Accès refusé")
        ]
    )]
    public function restore(Request $request)
    {
        $validated = $request->validate([
            'backup_id' => 'required|exists:backups_log,id'
        ]);

        try {
            $backup = BackupLog::findOrFail($validated['backup_id']);

            if (!File::exists($backup->file_path)) {
                return response()->json([
                    'message' => 'Fichier de backup introuvable',
                    'file_path' => $backup->file_path
                ], 404);
            }

            $host = env('DB_HOST', '127.0.0.1');
            $database = env('DB_DATABASE', 'moustass');
            $username = env('DB_USERNAME', 'root');
            $password = env('DB_PASSWORD', '');

            $mysqlPath = 'C:\\wamp64\\bin\\mysql\\mysql8.0.31\\bin\\mysql';

            if (!file_exists($mysqlPath . '.exe')) {
                $mysqlDir = 'C:\\wamp64\\bin\\mysql\\';
                $versions = glob($mysqlDir . 'mysql*');
                if (!empty($versions)) {
                    $mysqlPath = $versions[0] . '\\bin\\mysql';
                }
            }

            $command = sprintf(
                '"%s" --host=%s --user=%s %s %s < "%s"',
                $mysqlPath, $host, $username,
                $password ? '--password=' . $password : '',
                $database, $backup->file_path
            );

            exec($command . ' 2>&1', $output, $returnCode);

            if ($returnCode !== 0) {
                throw new \Exception('Erreur restauration : ' . implode("\n", $output));
            }

            return response()->json([
                'message' => 'Base de données restaurée avec succès',
                'backup' => $backup,
                'restored_at' => now()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la restauration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function exportIncrementalData($filepath, $since)
    {
        $sql = "-- Backup incrémental depuis {$since}\n";
        $sql .= "-- Généré le : " . now() . "\n\n";

        $users = DB::table('users')
            ->where(function($query) use ($since) {
                $query->where('updated_at', '>', $since)
                      ->orWhere('created_at', '>', $since);
            })
            ->get();

        if ($users->count() > 0) {
            $sql .= "-- Users modifiés/créés ({$users->count()})\n";
            foreach ($users as $user) {
                $sql .= $this->generateInsertStatement('users', (array)$user);
            }
            $sql .= "\n";
        }

        File::put($filepath, $sql);
    }

    private function generateInsertStatement($table, $data)
    {
        $columns = array_keys($data);
        $values = array_map(function($value) {
            if (is_null($value)) return 'NULL';
            return "'" . addslashes($value) . "'";
        }, array_values($data));

        $updates = array_map(function($col) use ($data) {
            $val = is_null($data[$col]) ? 'NULL' : "'" . addslashes($data[$col]) . "'";
            return "`{$col}` = {$val}";
        }, $columns);

        return sprintf(
            "INSERT INTO `%s` (`%s`) VALUES (%s) ON DUPLICATE KEY UPDATE %s;\n",
            $table,
            implode('`, `', $columns),
            implode(', ', $values),
            implode(', ', $updates)
        );
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
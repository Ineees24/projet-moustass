<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use App\Models\BackupLog;

class BackupController extends Controller
{
    private $backupPath;

    public function __construct()
    {
        // Chemin où stocker les backups
        $this->backupPath = storage_path('app/backups');
        
        // Créer le dossier s'il n'existe pas
        if (!File::exists($this->backupPath)) {
            File::makeDirectory($this->backupPath, 0755, true);
        }
    }

    /**
     * GET /admin/backups/history
     */
    public function history()
    {
        $backups = BackupLog::orderBy('created_at', 'desc')->get();
        return response()->json([
            'backups' => $backups,
            'count' => $backups->count()
        ]);
    }

    /**
     * POST /admin/backups/full
     */
    public function full(Request $request)
    {
        try {
            $timestamp = now()->format('Y-m-d_H-i-s');
            $filename = "full_backup_{$timestamp}.sql";
            $filepath = $this->backupPath . '/' . $filename;

            // Récupérer les paramètres de connexion
            $host = env('DB_HOST', '127.0.0.1');
            $database = env('DB_DATABASE', 'moustass');
            $username = env('DB_USERNAME', 'root');
            $password = env('DB_PASSWORD', '');

            // Trouver le bon chemin mysqldump (adaptez selon votre version MySQL)
            $mysqldumpPath = 'C:\\wamp64\\bin\\mysql\\mysql8.0.31\\bin\\mysqldump';
            
            // Vérifier si le fichier existe, sinon chercher d'autres versions
            if (!file_exists($mysqldumpPath . '.exe')) {
                // Chercher automatiquement la version MySQL
                $mysqlDir = 'C:\\wamp64\\bin\\mysql\\';
                $versions = glob($mysqlDir . 'mysql*');
                if (!empty($versions)) {
                    $mysqldumpPath = $versions[0] . '\\bin\\mysqldump';
                }
            }

            // Commande mysqldump
            $command = sprintf(
                '"%s" --host=%s --user=%s %s %s > "%s"',
                $mysqldumpPath,
                $host,
                $username,
                $password ? '--password=' . $password : '',
                $database,
                $filepath
            );

            // Exécuter la commande
            exec($command . ' 2>&1', $output, $returnCode);

            if ($returnCode !== 0 || !file_exists($filepath)) {
                throw new \Exception('Erreur mysqldump : ' . implode("\n", $output));
            }

            // Enregistrer dans la table backups_log
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
            // Logger l'échec
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

    /**
     * POST /admin/backups/incremental
     */
    public function incremental(Request $request)
    {
        try {
            // Récupérer le dernier backup réussi
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

            // Exporter les données modifiées depuis le dernier backup
            $this->exportIncrementalData($filepath, $lastBackup->created_at);

            // Enregistrer dans la table backups_log
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

    /**
     * POST /admin/backups/restore
     */
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

            // Récupérer les paramètres de connexion
            $host = env('DB_HOST', '127.0.0.1');
            $database = env('DB_DATABASE', 'moustass');
            $username = env('DB_USERNAME', 'root');
            $password = env('DB_PASSWORD', '');

            // Trouver le bon chemin mysql
            $mysqlPath = 'C:\\wamp64\\bin\\mysql\\mysql8.0.31\\bin\\mysql';
            
            if (!file_exists($mysqlPath . '.exe')) {
                $mysqlDir = 'C:\\wamp64\\bin\\mysql\\';
                $versions = glob($mysqlDir . 'mysql*');
                if (!empty($versions)) {
                    $mysqlPath = $versions[0] . '\\bin\\mysql';
                }
            }

            // Commande mysql pour restaurer
            $command = sprintf(
                '"%s" --host=%s --user=%s %s %s < "%s"',
                $mysqlPath,
                $host,
                $username,
                $password ? '--password=' . $password : '',
                $database,
                $backup->file_path
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

    /**
     * Exporter les données modifiées depuis le dernier backup
     */
    private function exportIncrementalData($filepath, $since)
    {
        $sql = "-- Backup incrémental depuis {$since}\n";
        $sql .= "-- Généré le : " . now() . "\n\n";

        // Exporter les users modifiés/créés depuis le dernier backup
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

        // Ajouter d'autres tables si nécessaire
        // Par exemple, messages, etc.

        File::put($filepath, $sql);
    }

    /**
     * Générer une instruction INSERT SQL avec ON DUPLICATE KEY UPDATE
     */
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

    /**
     * Formater la taille du fichier
     */
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
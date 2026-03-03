<?php

namespace App\Http\Controllers;

use App\Models\BackupLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BackupController extends Controller
{
    // ─────────────────────────────────────────────
    // Chemins et configuration
    // ─────────────────────────────────────────────

    // Dossier où les backups seront stockés
    private function backupDir(): string
    {
        $dir = storage_path('app/backups');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        return $dir;
    }

    // Paramètres MySQL depuis le .env
    private function dbConfig(): array
    {
        return [
            'host'     => config('database.connections.mysql.host'),
            'port'     => config('database.connections.mysql.port'),
            'database' => config('database.connections.mysql.database'),
            'username' => config('database.connections.mysql.username'),
            'password' => config('database.connections.mysql.password'),
        ];
    }

    // ─────────────────────────────────────────────
    // POST /admin/backups/incremental
    // Sauvegarde incrémentale : exporte uniquement
    // les lignes modifiées depuis le dernier backup
    // ─────────────────────────────────────────────
    public function incremental()
    {
        try {
            $db       = $this->dbConfig();
            $dir      = $this->backupDir();
            $filename = 'incremental_' . now()->format('Ymd_His') . '.sql';
            $filepath = $dir . '/' . $filename;

            // Trouve la date du dernier backup réussi
            $lastBackup = BackupLog::where('status', 'success')
                ->orderByDesc('created_at')
                ->first();

            $since = $lastBackup
                ? $lastBackup->created_at
                : '1970-01-01 00:00:00';

            // Tables critiques à sauvegarder en incrémental
            $tables = ['users', 'messages', 'backups_log'];

            $sql = "-- Backup incrémental Moustass\n";
            $sql .= "-- Depuis : {$since}\n";
            $sql .= "-- Généré le : " . now() . "\n\n";
            $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

            foreach ($tables as $table) {
                // Vérifie que la colonne created_at ou updated_at existe
                $columns = DB::select("SHOW COLUMNS FROM `{$table}`");
                $colNames = array_column($columns, 'Field');

                $dateCol = in_array('updated_at', $colNames)
                    ? 'updated_at'
                    : (in_array('created_at', $colNames) ? 'created_at' : null);

                if ($dateCol) {
                    $rows = DB::table($table)
                        ->where($dateCol, '>=', $since)
                        ->get();
                } else {
                    // Si pas de colonne date, on exporte tout
                    $rows = DB::table($table)->get();
                }

                if ($rows->isEmpty()) continue;

                $sql .= "-- Table: {$table} ({$rows->count()} ligne(s))\n";

                foreach ($rows as $row) {
                    $row    = (array) $row;
                    $cols   = '`' . implode('`, `', array_keys($row)) . '`';
                    $vals   = implode(', ', array_map(function ($v) {
                        return is_null($v) ? 'NULL' : "'" . addslashes($v) . "'";
                    }, array_values($row)));
                    $sql   .= "INSERT INTO `{$table}` ({$cols}) VALUES ({$vals}) ON DUPLICATE KEY UPDATE ";
                    $updates = implode(', ', array_map(
                        fn($k) => "`{$k}` = VALUES(`{$k}`)",
                        array_keys($row)
                    ));
                    $sql .= $updates . ";\n";
                }
                $sql .= "\n";
            }

            $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

            // Écrit le fichier SQL
            file_put_contents($filepath, $sql);

            // Enregistre dans backups_log
            BackupLog::create([
                'type'      => 'incremental',
                'file_path' => $filepath,
                'status'    => 'success',
                'notes'     => "Incrémental depuis {$since} — " . count($tables) . " tables",
                'created_at' => now(),
            ]);

            return response()->json([
                'message'   => 'Sauvegarde incrémentale réussie',
                'file'      => $filename,
                'since'     => $since,
            ], 201);

        } catch (\Exception $e) {
            BackupLog::create([
                'type'       => 'incremental',
                'file_path'  => '',
                'status'     => 'failed',
                'notes'      => $e->getMessage(),
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Échec de la sauvegarde',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    // POST /admin/backups/full
    // Sauvegarde complète via mysqldump
    // ─────────────────────────────────────────────
    public function full()
    {
        try {
            $db       = $this->dbConfig();
            $dir      = $this->backupDir();
            $filename = 'full_' . now()->format('Ymd_His') . '.sql';
            $filepath = $dir . '/' . $filename;

            // Construction de la commande mysqldump
            $password = $db['password']
                ? '-p' . escapeshellarg($db['password'])
                : '';

            $command = sprintf(
                'mysqldump -h %s -P %s -u %s %s %s > %s 2>&1',
                escapeshellarg($db['host']),
                escapeshellarg($db['port']),
                escapeshellarg($db['username']),
                $password,
                escapeshellarg($db['database']),
                escapeshellarg($filepath)
            );

            exec($command, $output, $returnCode);

            if ($returnCode !== 0) {
                throw new \Exception('mysqldump a échoué : ' . implode("\n", $output));
            }

            BackupLog::create([
                'type'       => 'full',
                'file_path'  => $filepath,
                'status'     => 'success',
                'notes'      => 'Sauvegarde complète mysqldump',
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Sauvegarde complète réussie',
                'file'    => $filename,
            ], 201);

        } catch (\Exception $e) {
            BackupLog::create([
                'type'       => 'full',
                'file_path'  => '',
                'status'     => 'failed',
                'notes'      => $e->getMessage(),
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Échec de la sauvegarde complète',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    // POST /admin/backups/restore
    // Restaure depuis le dernier backup réussi
    // ─────────────────────────────────────────────
    public function restore(Request $request)
    {
        try {
            // Prend le dernier backup réussi (full ou incremental)
            $backup = BackupLog::where('status', 'success')
                ->orderByDesc('created_at')
                ->first();

            if (! $backup) {
                return response()->json([
                    'message' => 'Aucun backup disponible pour la restauration',
                ], 404);
            }

            if (! file_exists($backup->file_path)) {
                return response()->json([
                    'message' => 'Fichier de backup introuvable : ' . $backup->file_path,
                ], 404);
            }

            // Exécute le fichier SQL de restauration
            $sql = file_get_contents($backup->file_path);
            DB::unprepared($sql);

            return response()->json([
                'message'    => 'Restauration réussie',
                'restored_from' => basename($backup->file_path),
                'backup_date'   => $backup->created_at,
                'type'          => $backup->type,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Échec de la restauration',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    // ─────────────────────────────────────────────
    // GET /admin/backups/history
    // Liste tous les backups enregistrés
    // ─────────────────────────────────────────────
    public function history()
    {
        $backups = BackupLog::orderByDesc('created_at')
            ->get()
            ->map(fn($b) => [
                'id'         => $b->id,
                'type'       => $b->type,
                'status'     => $b->status,
                'file'       => basename($b->file_path),
                'notes'      => $b->notes,
                'created_at' => $b->created_at,
            ]);

        return response()->json($backups);
    }
}
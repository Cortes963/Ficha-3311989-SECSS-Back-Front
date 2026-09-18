<?php
declare(strict_types=1);

namespace Secss;

use PDO;

final class CenterModel
{
    public function __construct(private PDO $db) {}

    public function all(): array
    {
        return $this->db->query('SELECT id, nombre_centro FROM centro ORDER BY nombre_centro ASC')->fetchAll();
    }
}

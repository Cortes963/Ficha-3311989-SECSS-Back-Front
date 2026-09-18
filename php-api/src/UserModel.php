<?php
declare(strict_types=1);

namespace Secss;

use PDO;

final class UserModel
{
    public function __construct(private PDO $db) {}

    public function profile(int $id): ?array
    {
        $q = $this->db->prepare(
            'SELECT u.*, c.correo, c.ultimo_login, c.created_at cuenta_created_at, c.estado cuenta_estado
             FROM usuario u JOIN cuenta c ON c.id_usuario=u.id WHERE u.id=?'
        );
        $q->execute([$id]);
        $user = $q->fetch();
        if (!$user) return null;
        $q = $this->db->prepare(
            'SELECT da.*, c.nombre_centro FROM detalle_aprendiz da
             LEFT JOIN centro c ON c.id=da.id_centro WHERE da.id_usuario=?'
        );
        $q->execute([$id]);
        $user['detalle_aprendiz'] = $q->fetch() ?: null;
        $q = $this->db->prepare(
            'SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol
             WHERE ur.id_usuario=? AND ur.estado=1'
        );
        $q->execute([$id]);
        $user['roles'] = array_column($q->fetchAll(), 'nombre_rol');
        return $user;
    }

    public function update(int $id, array $data): void
    {
        $fields = ['primer_nombre','segundo_nombre','primer_apellido','segundo_apellido','n_celular'];
        $sets = []; $values = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) { $sets[] = "$field=?"; $values[] = $data[$field]; }
        }
        if ($sets) {
            $values[] = $id;
            $this->db->prepare('UPDATE usuario SET '.implode(',', $sets).' WHERE id=?')->execute($values);
        }
        if (array_key_exists('correo', $data)) {
            $this->db->prepare('UPDATE cuenta SET correo=? WHERE id_usuario=?')->execute([$data['correo'], $id]);
        }
        if (!$sets && !array_key_exists('correo', $data)) {
            throw new \InvalidArgumentException('No hay datos para actualizar.');
        }
    }
}

<?php
declare(strict_types=1);

namespace Secss;

use PDO;

final class AuthModel
{
    public function __construct(private PDO $db) {}

    public function accountByDocument(string $document): ?array
    {
        $q = $this->db->prepare(
            'SELECT c.*, u.numero_documento, u.primer_nombre, u.segundo_nombre,
                    u.primer_apellido, u.segundo_apellido, u.estado usuario_estado
             FROM cuenta c JOIN usuario u ON u.id=c.id_usuario
             WHERE u.numero_documento=? LIMIT 1'
        );
        $q->execute([$document]);
        return $q->fetch() ?: null;
    }

    public function roles(int $userId): array
    {
        $q = $this->db->prepare(
            'SELECT r.nombre_rol FROM usuario_rol ur JOIN rol r ON r.id=ur.id_rol
             WHERE ur.id_usuario=? AND ur.estado=1'
        );
        $q->execute([$userId]);
        return array_column($q->fetchAll(), 'nombre_rol');
    }

    public function register(array $data): int
    {
        $this->db->beginTransaction();
        try {
            $q = $this->db->prepare(
                'INSERT INTO usuario (tipo_documento,numero_documento,primer_nombre,segundo_nombre,
                 primer_apellido,segundo_apellido,n_celular,estado) VALUES (?,?,?,?,?,?,?,1)'
            );
            $q->execute([$data['tipo_documento'], $data['numero_documento'], $data['primer_nombre'],
                $data['segundo_nombre'] ?? null, $data['primer_apellido'], $data['segundo_apellido'] ?? null,
                $data['n_celular']]);
            $id = (int)$this->db->lastInsertId();
            $q = $this->db->prepare('INSERT INTO cuenta (id_usuario,correo,password_hash,estado) VALUES (?,?,?,1)');
            $q->execute([$id, $data['correo'], password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12])]);
            $role = $this->db->prepare('SELECT id FROM rol WHERE nombre_rol=?');
            $role->execute(['APRENDIZ']);
            $roleId = $role->fetchColumn();
            if (!$roleId) {
                throw new \RuntimeException('Rol inexistente.');
            }
            $this->db->prepare('INSERT INTO usuario_rol (id_usuario,id_rol,estado) VALUES (?,?,1)')
                ->execute([$id, $roleId]);
            $detail = $data['detalle_aprendiz'];
            $this->db->prepare(
                'INSERT INTO detalle_aprendiz (id_usuario,id_centro,ficha,imagen_url_aprendiz,direccion,
                 imagen_url_identificacion,imagen_url_carnet_sena,fecha_vinculacion,fecha_terminacion)
                 VALUES (?,?,?,?,?,?,?,?,?)'
            )->execute([$id, $detail['id_centro'], $detail['ficha'], $detail['imagen_url_aprendiz'] ?? null,
                $detail['direccion'], $detail['imagen_url_identificacion'] ?? null,
                $detail['imagen_url_carnet_sena'] ?? null, $detail['fecha_vinculacion'],
                $detail['fecha_terminacion'] ?? null]);
            $this->db->commit();
            return $id;
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}

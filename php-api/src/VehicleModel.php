<?php
declare(strict_types=1);

namespace Secss;

use PDO;

final class VehicleModel
{
    public function __construct(private PDO $db) {}

    private function sql(string $where): string
    {
        return 'SELECT v.*, av.estado estado_cupo, dm.placa, dm.cilindraje, dm.modelo,
                dm.imagen_url_soat, dm.imagen_url_tecnomecanica_vigente,
                dbi.numero_marco, dbi.clase_bicicleta
                FROM auth_vehiculo av JOIN vehiculo v ON v.id=av.id_vehiculo
                LEFT JOIN detalle_moto dm ON dm.id_vehiculo=v.id
                LEFT JOIN detalle_bicicleta dbi ON dbi.id_vehiculo=v.id '.$where;
    }

    private function normalize(array $row): array
    {
        $row['detalles'] = $row['tipo_vehiculo'] === 'MOTO'
            ? ['placa'=>$row['placa']??null,'cilindraje'=>$row['cilindraje']??null,'modelo'=>$row['modelo']??null,
               'imagen_url_soat'=>$row['imagen_url_soat']??null,'imagen_url_tecnomecanica_vigente'=>$row['imagen_url_tecnomecanica_vigente']??null]
            : ['numero_marco'=>$row['numero_marco']??null,'clase_bicicleta'=>$row['clase_bicicleta']??null];
        $row['imagenes'] = array_intersect_key($row, array_flip([
            'imagen_url_vehiculo','imagen_url_identificacion_vehiculo','imagen_url_tarjeta_propiedad',
            'imagen_url_soat','imagen_url_tecnomecanica_vigente'
        ]));
        return $row;
    }

    public function mine(int $userId): array
    {
        $q = $this->db->prepare($this->sql('WHERE av.id_usuario=? ORDER BY v.id DESC'));
        $q->execute([$userId]);
        return array_map(fn(array $r) => $this->normalize($r), $q->fetchAll());
    }

    public function one(int $userId, int $vehicleId): ?array
    {
        $q = $this->db->prepare($this->sql('WHERE av.id_usuario=? AND av.id_vehiculo=?'));
        $q->execute([$userId, $vehicleId]);
        $row = $q->fetch();
        return $row ? $this->normalize($row) : null;
    }

    public function create(int $userId, array $p): int
    {
        $type = strtoupper((string)($p['tipo_vehiculo'] ?? ''));
        if (!in_array($type, ['MOTO','BICICLETA'], true)) throw new \InvalidArgumentException('tipo_vehiculo debe ser MOTO o BICICLETA.');
        foreach (['tipo_vehiculo','marca','color'] as $key) if (empty($p[$key])) throw new \InvalidArgumentException("Falta el campo obligatorio: $key.");
        $this->db->beginTransaction();
        try {
            $this->db->prepare('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND estado=1')->execute([$userId]);
            $this->db->prepare('INSERT INTO vehiculo (tipo_vehiculo,marca,color,imagen_url_tarjeta_propiedad,imagen_url_identificacion_vehiculo,imagen_url_vehiculo,estado) VALUES (?,?,?,?,?,?,1)')
                ->execute([$type,$p['marca'],$p['color'],$p['imagen_url_tarjeta_propiedad']??null,$p['imagen_url_identificacion_vehiculo']??null,$p['imagen_url_vehiculo']??null]);
            $id=(int)$this->db->lastInsertId();
            if ($type === 'MOTO') {
                foreach (['placa','cilindraje','modelo'] as $key) if (empty($p[$key])) throw new \InvalidArgumentException("Falta el campo obligatorio: $key.");
                $this->db->prepare('INSERT INTO detalle_moto (id_vehiculo,placa,cilindraje,modelo,imagen_url_soat,imagen_url_tecnomecanica_vigente) VALUES (?,?,?,?,?,?)')
                    ->execute([$id,$p['placa'],$p['cilindraje'],$p['modelo'],$p['imagen_url_soat']??null,$p['imagen_url_tecnomecanica_vigente']??null]);
            } else {
                foreach (['numero_marco','clase_bicicleta'] as $key) if (empty($p[$key])) throw new \InvalidArgumentException("Falta el campo obligatorio: $key.");
                $this->db->prepare('INSERT INTO detalle_bicicleta (id_vehiculo,numero_marco,clase_bicicleta) VALUES (?,?,?)')->execute([$id,$p['numero_marco'],$p['clase_bicicleta']]);
            }
            $this->db->prepare('INSERT INTO auth_vehiculo (id_usuario,id_vehiculo,estado,id_usuario_administrador) VALUES (?,?,0,NULL)')->execute([$userId,$id]);
            $this->db->commit();
            return $id;
        } catch (\Throwable $e) { $this->db->rollBack(); throw $e; }
    }

    public function deactivate(int $userId, int $vehicleId): bool
    {
        $q=$this->db->prepare('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND id_vehiculo=? AND estado=1');
        $q->execute([$userId,$vehicleId]); return $q->rowCount() > 0;
    }

    public function update(int $userId, int $vehicleId, array $p): bool
    {
        $current = $this->one($userId, $vehicleId);
        if (!$current) return false;
        $this->db->beginTransaction();
        try {
            $fields = ['marca','color','imagen_url_tarjeta_propiedad','imagen_url_identificacion_vehiculo','imagen_url_vehiculo'];
            $sets=[]; $values=[];
            foreach ($fields as $field) if (array_key_exists($field,$p)) { $sets[]="$field=?"; $values[]=$p[$field]; }
            if ($sets) { $values[]=$vehicleId; $this->db->prepare('UPDATE vehiculo SET '.implode(',',$sets).' WHERE id=?')->execute($values); }
            $table = $current['tipo_vehiculo'] === 'MOTO' ? 'detalle_moto' : 'detalle_bicicleta';
            $detailFields = $current['tipo_vehiculo'] === 'MOTO'
                ? ['placa','cilindraje','modelo','imagen_url_soat','imagen_url_tecnomecanica_vigente']
                : ['numero_marco','clase_bicicleta'];
            $sets=[]; $values=[];
            foreach ($detailFields as $field) if (array_key_exists($field,$p)) { $sets[]="$field=?"; $values[]=$p[$field]; }
            if ($sets) { $values[]=$vehicleId; $this->db->prepare("UPDATE $table SET ".implode(',',$sets).' WHERE id_vehiculo=?')->execute($values); }
            $this->db->prepare('UPDATE auth_vehiculo SET estado=0 WHERE id_usuario=? AND id_vehiculo=?')->execute([$userId,$vehicleId]);
            $this->db->commit(); return true;
        } catch (\Throwable $e) { $this->db->rollBack(); throw $e; }
    }
}
